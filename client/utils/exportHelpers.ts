
import JSZip from 'jszip';
import * as ExcelJS from 'exceljs';
import { Client, Payment, GeneralSettings } from '../types';
import { createInvoiceDoc } from './pdfGenerator';
import { getInvoiceDisplayId } from './invoiceId';
import { addSheetFromObjects, downloadWorkbook } from './excelUtils';
import { apiRequest, getAuthToken, withUploadToken } from './api';

const trackActivity = (action: string, details: string) => {
  void apiRequest('/api/v1/audit', {
    method: 'POST',
    body: JSON.stringify({
      action,
      module: 'exports',
      details,
      severity: 'info'
    })
  }).catch(() => {});
};

// Helper to convert data URL to Blob
const dataURLToBlob = (dataURL: string) => {
  try {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("Error converting Data URL to Blob", e);
    return null;
  }
};

// Generate Excel Workbook for a specific client
const createClientSheet = (client: Client): ExcelJS.Workbook => {
  const wb = new ExcelJS.Workbook();

  // 1. Basic Info Sheet
  const basicInfo = [
    { Field: 'Unique ID', Value: client.uniqueId || 'N/A' },
    { Field: 'Company Name', Value: client.companyName },
    { Field: 'Contact Name', Value: client.contactName },
    { Field: 'Email', Value: client.email },
    { Field: 'Phone', Value: client.phone },
    { Field: 'Country', Value: client.country },
    { Field: 'Account Manager', Value: client.accountManagerName },
    { Field: 'Onboarded Date', Value: new Date(client.onboardedAt).toLocaleDateString() },
  ];
  addSheetFromObjects(wb, "Client Info", basicInfo);

  // 2. Services Sheet
  const servicesData = client.services.map(s => ({
    Type: s.type,
    Price: s.price,
    Status: s.status,
    StartDate: new Date(s.startDate).toLocaleDateString(),
    DurationDays: s.duration
  }));
  addSheetFromObjects(wb, "Services", servicesData);

  // 3. Notes Sheet
  const notesData = (client.notes || []).map(n => ({
    Date: new Date(n.timestamp).toLocaleString(),
    Author: n.author,
    Content: n.content
  }));
  addSheetFromObjects(wb, "Notes", notesData);

  return wb;
};

// --- Public Functions ---

export const downloadClientExcel = async (client: Client) => {
  const wb = createClientSheet(client);
  await downloadWorkbook(wb, `${client.companyName.replace(/[^a-z0-9]/gi, '_')}_Data.xlsx`);
  trackActivity('file.download_excel', `Downloaded client excel for ${client.contactName || client.companyName || client.id}`);
};

// NEW: Helper to download duplicates found during import
export const downloadDuplicates = async (data: any[], type: 'leads' | 'clients') => {
  if (!data || data.length === 0) return;

  // Clean up data for export: remove internal keys, ensure duplicate reason is visible
  const cleanData = data.map(item => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _raw, ...rest } = item;
    return rest;
  });

  const wb = new ExcelJS.Workbook();
  addSheetFromObjects(wb, "Duplicates", cleanData);
  await downloadWorkbook(wb, `Matlance_${type}_Duplicates_${new Date().toISOString().split('T')[0]}.xlsx`);
  trackActivity('file.download_duplicates', `Downloaded ${type} duplicates report (${cleanData.length} row(s))`);
};

const resolveDocUrls = (doc: any): string[] => {
  const urls: string[] = [];
  if (doc?.url) urls.push(String(doc.url));
  if (doc?.localPath) {
    urls.push(`${window.location.origin}/uploads/${String(doc.localPath).replace(/^\/+/, '')}`);
  }
  return Array.from(new Set(urls.filter(Boolean)));
};

const isProtectedUploadUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.startsWith('/uploads/');
  } catch {
    return false;
  }
};

// Helper to get Blob from URL (Data URL or HTTP) with auth support for protected /uploads paths
const getBlobFromUrl = async (url: string): Promise<Blob | null> => {
  try {
    if (!url) return null;
    if (url.startsWith('data:')) {
      return dataURLToBlob(url);
    }

    const finalUrl = isProtectedUploadUrl(url) ? withUploadToken(url) : url;
    const headers: Record<string, string> = {};

    if (isProtectedUploadUrl(finalUrl)) {
      const token = getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(finalUrl, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.blob();
  } catch (e) {
    console.error("Error fetching file blob", e);
    return null;
  }
};

const getBlobFromDoc = async (doc: any): Promise<Blob | null> => {
  const candidates = resolveDocUrls(doc);
  for (const url of candidates) {
    const blob = await getBlobFromUrl(url);
    if (blob) return blob;
  }
  return null;
};

export const downloadClientZip = async (client: Client) => {
  const zip = new JSZip();
  // Using Unique ID for folder naming to match bulk export
  const uniqueIdentifier = client.uniqueId || client.readableId;
  const folderName = `${client.companyName.replace(/[^a-z0-9]/gi, '_')}_${uniqueIdentifier}`;
  const root = zip.folder(folderName);

  if (!root) return;

  // 1. Add Excel Data
  const wb = createClientSheet(client);
  const excelBuffer = await wb.xlsx.writeBuffer();
  root.file(`${folderName}_Data.xlsx`, excelBuffer);

  // 2. Add Documents (Invoices)
  const invoicesFolder = root.folder("Invoices");
  if (invoicesFolder && client.invoices) {
    const promises = client.invoices.map(async doc => {
      const blob = await getBlobFromDoc(doc);
      if (blob) invoicesFolder.file(doc.name, blob);
    });
    await Promise.all(promises);
  }

  // 3. Add Documents (Contracts/Others)
  const docsFolder = root.folder("Documents");
  if (docsFolder && client.documents) {
    const promises = client.documents.map(async doc => {
      const blob = await getBlobFromDoc(doc);
      if (blob) docsFolder.file(doc.name, blob);
    });
    await Promise.all(promises);
  }

  // Generate and Download
  const content = await zip.generateAsync({ type: "blob" });

  // Create download link
  const url = window.URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName}_Full_Package.zip`;
  a.click();
  window.URL.revokeObjectURL(url);
  trackActivity('file.download_client_zip', `Downloaded client package zip for ${client.contactName || client.companyName || client.id}`);
};

export const downloadBulkClientsZip = async (
  clients: Client[],
  onProgress?: (percent: number, status: string) => void
) => {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];
  const masterFolder = zip.folder(`Matlance_Clients_Export_${dateStr}`);

  if (!masterFolder) return;

  const totalClients = clients.length;
  const CHUNK_SIZE = 5;

  // Process in chunks
  for (let i = 0; i < totalClients; i += CHUNK_SIZE) {
    const chunk = clients.slice(i, i + CHUNK_SIZE);

    // Process chunk
    for (const client of chunk) {
      const uniqueIdentifier = client.uniqueId || client.readableId;
      const safeName = `${(client.companyName || 'Client').replace(/[^a-z0-9]/gi, '_')}_${uniqueIdentifier}`;

      const clientFolder = masterFolder.folder(safeName);

      if (clientFolder) {
        // A. Add Excel
        try {
          const wb = createClientSheet(client);
          const excelBuffer = await wb.xlsx.writeBuffer();
          clientFolder.file(`${safeName}_Data.xlsx`, excelBuffer);
        } catch (e) {
          console.error(`Failed to generate excel for ${safeName}`, e);
        }

        // B. Add Invoices
        if (client.invoices && client.invoices.length > 0) {
          const invFolder = clientFolder.folder("Invoices");
          if (invFolder) {
            const promises = client.invoices.map(async doc => {
              const blob = await getBlobFromDoc(doc);
              if (blob) invFolder.file(doc.name, blob);
            });
            await Promise.all(promises);
          }
        }

        // C. Add Documents
        if (client.documents && client.documents.length > 0) {
          const docFolder = clientFolder.folder("Documents");
          if (docFolder) {
            const promises = client.documents.map(async doc => {
              const blob = await getBlobFromDoc(doc);
              if (blob) docFolder.file(doc.name, blob);
            });
            await Promise.all(promises);
          }
        }
      }
    }

    // Update Progress
    if (onProgress) {
      const currentCount = Math.min(i + CHUNK_SIZE, totalClients);
      const percent = Math.floor((currentCount / totalClients) * 60);
      onProgress(percent, `Preparing files: ${currentCount} / ${totalClients}`);
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  if (onProgress) onProgress(60, "Archiving data (this may take a minute)...");

  // Generate Master ZIP
  try {
    const compressionMethod = totalClients > 200 ? "STORE" : "DEFLATE";

    const content = await zip.generateAsync({
      type: "blob",
      compression: compressionMethod,
      compressionOptions: { level: 6 }
    }, (metadata) => {
      if (onProgress) {
        const totalPercent = 60 + (metadata.percent * 0.4);
        onProgress(Math.floor(totalPercent), `Archiving... ${Math.floor(metadata.percent)}%`);
      }
    });

    if (onProgress) onProgress(100, "Download starting...");

    const url = window.URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Matlance_Clients_Bulk_${totalClients}_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    trackActivity('file.download_bulk_clients_zip', `Downloaded bulk clients zip (${totalClients} client(s))`);
  } catch (err) {
    console.error("ZIP Generation Failed:", err);
    throw new Error("Failed to compress files. The dataset might be too large for browser memory.");
  }
};

export const downloadBulkInvoicesZip = async (
  payments: Payment[],
  clients: Client[],
  settings: GeneralSettings,
  onProgress?: (percent: number, status: string) => void
) => {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];
  const root = zip.folder(`Matlance_Invoices_${dateStr}`);

  if (!root) return;

  const total = payments.length;
  let processed = 0;

  for (const payment of payments) {
    const client = clients.find(c => c.id === payment.clientId);
    try {
      const doc = createInvoiceDoc(payment, client, settings);
      const pdfBlob = doc.output('blob');
      const invoiceNumber = getInvoiceDisplayId(payment.invoiceId, payment.id);
      const fileName = `Invoice_${invoiceNumber}_${payment.clientName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      root.file(fileName, pdfBlob);
    } catch (e) {
      const invoiceNumber = getInvoiceDisplayId(payment.invoiceId, payment.id);
      console.error(`Failed to generate PDF for ${invoiceNumber || payment.id}`, e);
    }

    processed++;
    if (onProgress && processed % 5 === 0) { // Update every 5 items to reduce render thrashing
      onProgress(Math.round((processed / total) * 80), `Generating PDFs... ${processed}/${total}`);
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
    }
  }

  if (onProgress) onProgress(80, "Compressing files...");

  const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
    if (onProgress) {
      onProgress(80 + (metadata.percent * 0.2), `Compressing... ${metadata.percent.toFixed(0)}%`);
    }
  });

  if (onProgress) onProgress(100, "Download starting...");

  const url = window.URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Matlance_Bulk_Invoices_${dateStr}.zip`;
  a.click();
  window.URL.revokeObjectURL(url);
  trackActivity('file.download_bulk_invoices_zip', `Downloaded bulk invoices zip (${payments.length} invoice(s))`);
};
