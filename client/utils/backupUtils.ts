

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

export const exportDatabase = async (
  onProgress?: (percent: number) => void,
  collections?: string[]
) => {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const query = collections && collections.length > 0
      ? `?collections=${encodeURIComponent(JSON.stringify(collections))}`
      : '';
    xhr.open('GET', `/api/v1/backup/export${query}`, true);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('matlance_token') || ''}`);

    if (onProgress) onProgress(5);

    xhr.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(95, Math.round((event.loaded / event.total) * 95));
        onProgress(percent);
      } else {
        onProgress(30);
      }
    };

    xhr.onloadstart = () => {
      if (onProgress) onProgress(10);
    };

    xhr.onerror = () => {
      reject(new Error('Failed to export database.'));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error('Failed to export database.'));
        return;
      }
      const blob = xhr.response;
      if (!blob || blob.size === 0) {
        reject(new Error('Export failed. Empty backup file.'));
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBlob(blob, `Matlance_Full_Backup_${timestamp}.zip`);
      if (onProgress) onProgress(100);
      resolve();
    };

    xhr.send();
  });
};

export const importDatabase = async (
    file: File, 
    onProgress?: (percent: number) => void,
    mode: 'merge' | 'replace' = 'merge',
    collections?: string[]
): Promise<{ success: boolean; message: string; summary?: Record<string, { added: number; skipped: number }> }> => {
  try {
    return await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('file', file);
      if (collections && collections.length > 0) {
        form.append('collections', JSON.stringify(collections));
      }

      xhr.open('POST', `/api/v1/backup/import?mode=${mode}`, true);
      xhr.responseType = 'json';
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('matlance_token') || ''}`);

      if (xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (!onProgress) return;
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(80, Math.round((event.loaded / event.total) * 80));
            onProgress(percent);
          } else {
            onProgress(30);
          }
        };
      }

      xhr.onerror = () => {
        resolve({ success: false, message: 'Restore failed.' });
      };

      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          const message = (xhr.response && xhr.response.message) ? xhr.response.message : 'Restore failed.';
          resolve({ success: false, message });
          return;
        }
        if (onProgress) onProgress(100);
        const data = xhr.response;
        resolve({ success: true, message: (data && data.message) ? data.message : 'Database restored successfully.', summary: data && data.summary ? data.summary : undefined });
      };

      xhr.send(form);
    });
  } catch (error: any) {
    console.error("Restoration Error:", error);
    return { success: false, message: `Restoration failed: ${error.message}` };
  }
};
