import { apiRequest } from './api';
import { useNotificationStore } from '../stores/notificationStore';

type OutboxStatus = 'queued' | 'sending';

interface OutboxJob {
  id: string;
  to: string;
  subject: string;
  html: string;
  accountId?: string;
  status: OutboxStatus;
  attempts: number;
  createdAt: string;
  lastAttemptAt?: string;
  nextRetryAt?: number;
}

interface QueueEmailInput {
  to: string;
  subject: string;
  html: string;
  accountId?: string;
}

const OUTBOX_STORAGE_KEY = 'matlance_email_outbox_v1';
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 5000;
const STUCK_SENDING_MS = 60000;

let isProcessing = false;

const hasStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readOutbox = (): OutboxJob[] => {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOutbox = (jobs: OutboxJob[]) => {
  if (!hasStorage()) return;
  window.localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(jobs));
};

const updateOutbox = (updater: (jobs: OutboxJob[]) => OutboxJob[]) => {
  const next = updater(readOutbox());
  writeOutbox(next);
  return next;
};

const nowIso = () => new Date().toISOString();
const uniqueId = () =>
  `email_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const isStuckSending = (job: OutboxJob) => {
  if (job.status !== 'sending') return false;
  if (!job.lastAttemptAt) return true;
  return Date.now() - new Date(job.lastAttemptAt).getTime() > STUCK_SENDING_MS;
};

const findNextJob = (jobs: OutboxJob[]) =>
  jobs.find((job) => {
    const retryWindowOpen = !job.nextRetryAt || Date.now() >= job.nextRetryAt;
    if (!retryWindowOpen) return false;
    return job.status === 'queued' || isStuckSending(job);
  });

export const queueEmailInBackground = ({ to, subject, html, accountId }: QueueEmailInput) => {
  const recipient = String(to || '').trim();
  if (!recipient) {
    throw new Error('Recipient email is required');
  }

  const job: OutboxJob = {
    id: uniqueId(),
    to: recipient,
    subject,
    html,
    accountId,
    status: 'queued',
    attempts: 0,
    createdAt: nowIso()
  };

  updateOutbox((jobs) => [...jobs, job]);
  useNotificationStore
    .getState()
    .addNotification('info', `Email queued for ${recipient}. You can continue working.`, 3500);

  void processEmailOutbox();
  return job.id;
};

export const processEmailOutbox = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const jobs = readOutbox();
      const job = findNextJob(jobs);
      if (!job) break;

      updateOutbox((current) =>
        current.map((item) =>
          item.id === job.id
            ? {
                ...item,
                status: 'sending',
                attempts: (item.attempts || 0) + 1,
                lastAttemptAt: nowIso()
              }
            : item
        )
      );

      try {
        await apiRequest('/api/v1/email/send', {
          method: 'POST',
          keepalive: true,
          body: JSON.stringify({
            to: job.to,
            subject: job.subject,
            html: job.html,
            ...(job.accountId ? { accountId: job.accountId } : {}),
            clientRequestId: job.id
          })
        });

        updateOutbox((current) => current.filter((item) => item.id !== job.id));
        useNotificationStore
          .getState()
          .addNotification('success', `Email sent to ${job.to}`);
      } catch (error: any) {
        const message = error?.message || 'Failed to send email';
        const latest = readOutbox().find((item) => item.id === job.id);
        const attempts = latest?.attempts || 1;
        const shouldRetry = attempts < MAX_ATTEMPTS;

        if (!shouldRetry) {
          updateOutbox((current) => current.filter((item) => item.id !== job.id));
          useNotificationStore
            .getState()
            .addNotification('error', `Failed to send email to ${job.to}: ${message}`, 5000);
          continue;
        }

        const retryDelay = RETRY_BASE_DELAY_MS * attempts;
        updateOutbox((current) =>
          current.map((item) =>
            item.id === job.id
              ? {
                  ...item,
                  status: 'queued',
                  nextRetryAt: Date.now() + retryDelay
                }
              : item
          )
        );
      }
    }
  } finally {
    isProcessing = false;
  }
};
