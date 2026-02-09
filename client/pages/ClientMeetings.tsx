
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../utils/api';
import { 
  Calendar, Video, Clock, CheckCircle2 
} from 'lucide-react';
import { Meeting, Client } from '../types';

// Buffer time in milliseconds (30 seconds)
const JOIN_BUFFER_MS = 30000;

const CountdownTimer: React.FC<{ targetDate: Date, onReady: () => void }> = ({ targetDate, onReady }) => {
    const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +targetDate - +new Date();
            
            // If meeting is within buffer or passed, allow joining
            if (difference < JOIN_BUFFER_MS) { 
                onReady();
                return null;
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        };

        // Initial call
        const initial = calculateTimeLeft();
        if (initial) setTimeLeft(initial);

        const timer = setInterval(() => {
            const tl = calculateTimeLeft();
            setTimeLeft(tl);
            if (!tl) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onReady]);

    if (!timeLeft) return null;

    return (
        <div className="grid grid-cols-4 gap-2 text-center my-4">
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.days}</span>
                <span className="text-[10px] text-textMuted uppercase">Days</span>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.hours}</span>
                <span className="text-[10px] text-textMuted uppercase">Hrs</span>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.minutes}</span>
                <span className="text-[10px] text-textMuted uppercase">Mins</span>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg">
                <span className="block text-xl font-bold text-textPrimary">{timeLeft.seconds}</span>
                <span className="text-[10px] text-textMuted uppercase">Secs</span>
            </div>
        </div>
    );
};

const buildMeetingDate = (meeting: Meeting) => {
    const base = new Date(meeting.date);
    if (Number.isNaN(base.getTime())) return null;
    const datePart = base.toISOString().split('T')[0];
    const timePart = meeting.time || '00:00';
    const combined = new Date(`${datePart}T${timePart}`);
    return Number.isNaN(combined.getTime()) ? base : combined;
};

const ClientMeetingCard: React.FC<{ meeting: Meeting; isPast?: boolean }> = ({ meeting, isPast }) => {
    const meetingDate = buildMeetingDate(meeting) || new Date(meeting.date);
    const [isReadyToJoin, setIsReadyToJoin] = useState(false);
    const hasJoinLink = Boolean(meeting.link && !meeting.link.includes('/meeting/'));

    // Initial check on mount
    useEffect(() => {
        if (isPast) return;
        if (!meetingDate || Number.isNaN(meetingDate.getTime())) return;
        const diff = +meetingDate - +new Date();
        if (diff < JOIN_BUFFER_MS) setIsReadyToJoin(true);
    }, [meetingDate, isPast]);

    const handleJoin = () => {
        if (hasJoinLink && meeting.link) {
            window.open(meeting.link, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="inline-block px-2 py-1 bg-softMint text-darkGreen text-[10px] font-bold uppercase rounded-md mb-2">
                        {meeting.type}
                    </span>
                    <h3 className="font-bold text-lg text-textPrimary leading-tight">{meeting.title}</h3>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-darkGreen border border-slate-100">
                    <span className="text-xs font-bold uppercase">{meetingDate.toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-bold">{meetingDate.getDate()}</span>
                </div>
            </div>

            <p className="text-sm text-textSecondary mb-6 flex-1">{meeting.agenda || 'No agenda provided.'}</p>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-textMuted">
                    <Clock size={16} />
                    <span>{meeting.time} (BD Time) • {meeting.duration} min</span>
                </div>

                {isPast ? (
                    <div className="bg-slate-50 p-3 rounded-xl border border-border text-center mb-2">
                        <p className="text-xs font-bold text-textMuted">Meeting {meeting.status || 'Completed'}</p>
                    </div>
                ) : !isReadyToJoin ? (
                    <div className="bg-slate-50 rounded-xl p-3 border border-border">
                        <p className="text-xs text-center font-bold text-textSecondary mb-2">Starts In:</p>
                        <CountdownTimer targetDate={meetingDate} onReady={() => setIsReadyToJoin(true)} />
                    </div>
                ) : (
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center mb-2">
                        <p className="text-xs font-bold text-green-700 flex items-center justify-center gap-1">
                            <CheckCircle2 size={14} /> Ready to start
                        </p>
                    </div>
                )}

                <button 
                    onClick={handleJoin}
                    disabled={isPast || !hasJoinLink || (!isReadyToJoin && !meeting.link)}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        !isPast && isReadyToJoin 
                        ? 'bg-darkGreen text-white hover:bg-opacity-90 shadow-lg shadow-darkGreen/20' 
                        : 'bg-slate-100 text-textMuted cursor-not-allowed'
                    }`}
                >
                    <Video size={18} />
                    {isPast ? 'Meeting Ended' : (isReadyToJoin ? 'Join Meeting Now' : 'Join Enabled Soon')}
                </button>
            </div>
        </div>
    );
};

const ClientMeetings: React.FC = () => {
  const { user } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
      let isMounted = true;

      const loadData = async () => {
          if (!user) {
              if (isMounted) {
                  setClient(null);
                  setMeetings([]);
                  setLoading(false);
              }
              return;
          }

          try {
              setLoading(true);
              const [clientRes, meetingsRes] = await Promise.all([
                  apiRequest<Client>('/api/v1/clients/me'),
                  apiRequest<Meeting[]>('/api/v1/meetings/me')
              ]);
              if (!isMounted) return;
              setClient(clientRes || null);
              setMeetings(Array.isArray(meetingsRes) ? meetingsRes : []);
          } catch {
              if (!isMounted) return;
              setClient(null);
              setMeetings([]);
          } finally {
              if (isMounted) setLoading(false);
          }
      };

      loadData();
      return () => {
          isMounted = false;
      };
  }, [user]);

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
      const now = new Date();
      const upcoming: Meeting[] = [];
      const past: Meeting[] = [];

      meetings.forEach(m => {
          const meetingDate = buildMeetingDate(m);
          if (!meetingDate) return;
          const isPast = meetingDate.getTime() < (now.getTime() - 3600000) || m.status === 'Completed' || m.status === 'Cancelled';
          if (isPast) past.push(m);
          else if (m.status !== 'Cancelled') upcoming.push(m);
      });

      upcoming.sort((a, b) => (buildMeetingDate(a)?.getTime() || 0) - (buildMeetingDate(b)?.getTime() || 0));
      past.sort((a, b) => (buildMeetingDate(b)?.getTime() || 0) - (buildMeetingDate(a)?.getTime() || 0));

      return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [meetings]);

  if (loading) {
      return <div className="p-8 text-center">Loading client profile...</div>;
  }

  if (!client) {
      return (
          <div className="p-8 text-center">
              <h2 className="text-lg font-bold text-textPrimary">No Account Found</h2>
              <p className="text-textSecondary">We couldn't associate your login with a client profile.</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-20">
        <div>
            <h2 className="text-2xl font-bold text-textPrimary">Scheduled Meetings</h2>
            <p className="text-textSecondary">Upcoming sessions with your account manager.</p>
        </div>

        <div className="flex items-center gap-2">
            <button
                onClick={() => setTab('upcoming')}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    tab === 'upcoming'
                        ? 'bg-softMint text-darkGreen border-primary/30'
                        : 'bg-white text-textSecondary border-border hover:bg-slate-50'
                }`}
            >
                Upcoming Meetings
            </button>
            <button
                onClick={() => setTab('past')}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    tab === 'past'
                        ? 'bg-softMint text-darkGreen border-primary/30'
                        : 'bg-white text-textSecondary border-border hover:bg-slate-50'
                }`}
            >
                Past Meetings
            </button>
        </div>

        {tab === 'upcoming' ? (
            upcomingMeetings.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-border rounded-2xl p-12 text-center">
                    <Calendar size={48} className="mx-auto mb-4 text-textMuted opacity-50" />
                    <h3 className="text-lg font-bold text-textPrimary">No Meetings Scheduled</h3>
                    <p className="text-textSecondary">You don't have any upcoming meetings at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingMeetings.map(meeting => (
                        <ClientMeetingCard key={meeting.id} meeting={meeting} />
                    ))}
                </div>
            )
        ) : (
            pastMeetings.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl p-8 text-center text-textMuted">
                    No past meetings yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastMeetings.map(meeting => (
                        <ClientMeetingCard key={meeting.id} meeting={meeting} isPast />
                    ))}
                </div>
            )
        )}

    </div>
  );
};

export default ClientMeetings;
