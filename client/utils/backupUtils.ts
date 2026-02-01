

// Helper to trigger download
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Generic JSON Export
export const exportToJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
};

// Generic JSON Import
export const importFromJson = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const json = JSON.parse(text);
                resolve(json);
            } catch (err) {
                reject(new Error("Invalid JSON file"));
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
};

// Robust Helper to merge arrays based on ID uniqueness and optional secondary key (e.g. email)
export const mergeArrays = (current: any[], incoming: any[], idKey = 'id', secondaryKey?: string) => {
    // Ensure inputs are arrays
    const curr = Array.isArray(current) ? current : [];
    const inc = Array.isArray(incoming) ? incoming : [];
    
    if (inc.length === 0) return curr;
    
    const existingIds = new Set(curr.map(i => i && i[idKey] ? i[idKey] : null).filter(Boolean));
    const existingSecondary = new Set(secondaryKey ? curr.map(i => i && i[secondaryKey] ? String(i[secondaryKey]).toLowerCase().trim() : null).filter(Boolean) : []);

    const merged = [...curr];
    
    let addedCount = 0;
    inc.forEach(item => {
        if (item && typeof item === 'object' && item[idKey]) {
            // Check ID Uniqueness
            if (!existingIds.has(item[idKey])) {
                // Check Secondary Key Uniqueness (if provided)
                if (secondaryKey && item[secondaryKey]) {
                    const secValue = String(item[secondaryKey]).toLowerCase().trim();
                    if (existingSecondary.has(secValue)) {
                        // Skip duplicate based on secondary key
                        return;
                    }
                    existingSecondary.add(secValue);
                }

                merged.push(item);
                existingIds.add(item[idKey]);
                addedCount++;
            }
        }
    });
    console.log(`Merged ${addedCount} new items. Total: ${merged.length}`);
    return merged;
};

// Helper to merge string arrays (like statuses)
export const mergeStringArrays = (current: string[], incoming: string[]) => {
    const curr = Array.isArray(current) ? current : [];
    const inc = Array.isArray(incoming) ? incoming : [];
    return Array.from(new Set([...curr, ...inc]));
};

export const exportDatabase = async () => {
  const res = await fetch('/api/v1/backup/export', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('matlance_token') || ''}`
    }
  });

  if (!res.ok) {
    let message = 'Failed to export database.';
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/zip')) {
    const text = await res.text();
    throw new Error(text || 'Export failed. Server did not return a ZIP file.');
  }

  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error('Export failed. Empty backup file.');
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadBlob(blob, `Matlance_Full_Backup_${timestamp}.zip`);
};

export const importDatabase = async (
    file: File, 
    onProgress?: (percent: number) => void
): Promise<{ success: boolean; message: string }> => {
  try {
    if (onProgress) onProgress(10);

    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/api/v1/backup/import', {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('matlance_token') || ''}`
      }
    });

    if (onProgress) onProgress(70);

    if (!res.ok) {
      let message = 'Restore failed.';
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        // ignore
      }
      return { success: false, message };
    }

    const data = await res.json();
    if (onProgress) onProgress(100);
    return { success: true, message: data.message || 'Database restored successfully.' };

  } catch (error: any) {
    console.error("Restoration Error:", error);
    return { success: false, message: `Restoration failed: ${error.message}` };
  }
};
