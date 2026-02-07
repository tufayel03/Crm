import React, { useEffect, useMemo, useState } from 'react';
import { Download, Trash2, Upload, RefreshCw, Folder, FileText, CheckSquare, Square } from 'lucide-react';
import { apiRequest, withUploadToken } from '../../utils/api';

interface FileItem {
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  url: string;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isBulkAction, setIsBulkAction] = useState(false);
  const [folder, setFolder] = useState('clients');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('clients');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  const totalSize = useMemo(() => {
    return files.reduce((sum, file) => sum + (file.size || 0), 0);
  }, [files]);

  const folders = useMemo(() => {
    const map = new Map<string, FileItem[]>();
    files.forEach(file => {
      const parts = file.path.split('/');
      parts.pop(); // remove filename
      const folderPath = parts.join('/') || 'root';
      if (!map.has(folderPath)) map.set(folderPath, []);
      map.get(folderPath)!.push(file);
    });
    const entries = Array.from(map.entries()).map(([name, items]) => ({
      name,
      count: items.length
    }));
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }, [files]);

  const visibleFiles = useMemo(() => {
    if (!selectedFolder || selectedFolder === 'all') return files;
    return files.filter(file => {
      const parts = file.path.split('/');
      parts.pop();
      const folderPath = parts.join('/') || 'root';
      return folderPath === selectedFolder;
    });
  }, [files, selectedFolder]);

  const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every(file => selectedPaths.includes(file.path));
  const hasSelection = selectedPaths.length > 0;

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<FileItem[]>('/api/v1/files');
      setFiles(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const targetFolder = folder.trim() || selectedFolder || '';
      if (targetFolder && targetFolder !== 'all') form.append('folder', targetFolder);
      const created = await apiRequest<FileItem>('/api/v1/files/upload', {
        method: 'POST',
        body: form
      });
      setFiles(prev => [created, ...prev]);
      setMessage('File uploaded.');
      const parts = created.path.split('/');
      parts.pop();
      const folderPath = parts.join('/') || 'root';
      setSelectedFolder(folderPath);
    } catch {
      setMessage('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (filePath: string) => {
    await apiRequest('/api/v1/files', {
      method: 'DELETE',
      body: JSON.stringify({ path: filePath })
    });
    setFiles(prev => prev.filter(f => f.path !== filePath));
    setSelectedPaths(prev => prev.filter(p => p !== filePath));
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleBulkDelete = async () => {
    if (!hasSelection) return;
    setIsBulkAction(true);
    try {
      await apiRequest('/api/v1/files/bulk-delete', {
        method: 'DELETE',
        body: JSON.stringify({ paths: selectedPaths })
      });
      setFiles(prev => prev.filter(f => !selectedPaths.includes(f.path)));
      setSelectedPaths([]);
    } finally {
      setIsBulkAction(false);
    }
  };

  const handleBulkDownload = async () => {
    if (!hasSelection) return;
    setIsBulkAction(true);
    try {
      const res = await fetch('/api/v1/files/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('matlance_token') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paths: selectedPaths })
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      downloadBlob(blob, `matlance_files_${Date.now()}.zip`);
    } finally {
      setIsBulkAction(false);
    }
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedPaths(prev => prev.filter(p => !visibleFiles.some(f => f.path === p)));
    } else {
      const visiblePaths = visibleFiles.map(f => f.path);
      setSelectedPaths(prev => Array.from(new Set([...prev, ...visiblePaths])));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-border space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <Folder size={18} className="text-primary" /> File Manager
          </h3>
          <p className="text-sm text-textSecondary">
            Manage uploaded invoices, contracts, and attachments.
            <span className="ml-2 text-textMuted">Total size: {formatSize(totalSize)}</span>
          </p>
        </div>
        <button
          onClick={fetchFiles}
          className="px-3 py-2 border border-border rounded-lg text-xs font-bold text-textSecondary hover:bg-slate-50 flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 border border-border rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-border text-xs font-bold text-textSecondary uppercase">Folders</div>
          <div className="max-h-[420px] overflow-y-auto">
            <button
              onClick={() => setSelectedFolder('all')}
              className={`w-full text-left px-3 py-2 text-sm font-semibold border-b border-border ${selectedFolder === 'all' ? 'bg-softMint text-darkGreen' : 'bg-white text-textSecondary hover:bg-slate-50'}`}
            >
              All Files
            </button>
            {folders.map(folderItem => (
              <button
                key={folderItem.name}
                onClick={() => setSelectedFolder(folderItem.name)}
                className={`w-full text-left px-3 py-2 text-sm font-semibold border-b border-border flex items-center justify-between ${selectedFolder === folderItem.name ? 'bg-softMint text-darkGreen' : 'bg-white text-textSecondary hover:bg-slate-50'}`}
              >
                <span className="truncate">{folderItem.name}</span>
                <span className="text-xs text-textMuted">{folderItem.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Upload to folder (e.g. invoices/2026)"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
            />
            <button
              onClick={() => setFolder(selectedFolder !== 'all' ? selectedFolder : '')}
              className="px-3 py-2 border border-border rounded-lg text-xs font-bold text-textSecondary hover:bg-slate-50"
            >
              Use selected folder
            </button>
            <label className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer ${isUploading ? 'bg-slate-200 text-textMuted' : 'bg-darkGreen text-white'}`}
              >
              <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>

          {message && (
            <div className="text-xs text-textSecondary">{message}</div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleSelectAllVisible}
              className="px-3 py-2 border border-border rounded-lg text-xs font-bold text-textSecondary hover:bg-slate-50 flex items-center gap-2"
            >
              {allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />} Select folder
            </button>
            <button
              onClick={handleBulkDownload}
              disabled={!hasSelection || isBulkAction}
              className="px-3 py-2 border border-border rounded-lg text-xs font-bold text-textSecondary hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={14} /> Download selected
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={!hasSelection || isBulkAction}
              className="px-3 py-2 border border-red-200 rounded-lg text-xs font-bold text-danger hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 size={14} /> Delete selected
            </button>
            {hasSelection && (
              <span className="text-xs text-textMuted">{selectedPaths.length} selected</span>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 bg-slate-50 p-3 text-[11px] font-bold text-textMuted uppercase">
              <div className="col-span-1">Select</div>
              <div className="col-span-4">File</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-3">Modified</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {isLoading && (
                <div className="p-4 text-sm text-textMuted">Loading files...</div>
              )}
              {!isLoading && visibleFiles.length === 0 && (
                <div className="p-4 text-sm text-textMuted">No files found.</div>
              )}
              {!isLoading && visibleFiles.map(file => (
                <div key={file.path} className="grid grid-cols-12 gap-2 p-3 items-center text-sm">
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedPaths.includes(file.path)}
                      onChange={(e) => {
                        setSelectedPaths(prev => {
                          if (e.target.checked) return [...prev, file.path];
                          return prev.filter(p => p !== file.path);
                        });
                      }}
                    />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <FileText size={14} className="text-textMuted" />
                    <div>
                      <div className="font-semibold text-textPrimary">{file.name}</div>
                      <div className="text-[11px] text-textMuted">{file.path}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-textSecondary">{formatSize(file.size)}</div>
                  <div className="col-span-3 text-textSecondary">{new Date(file.modifiedAt).toLocaleString()}</div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <a
                      href={withUploadToken(file.url)}
                      className="px-2 py-1 border border-border rounded text-xs font-bold text-textSecondary hover:bg-slate-50 flex items-center gap-1"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={12} /> Download
                    </a>
                    <button
                      onClick={() => handleDelete(file.path)}
                      className="px-2 py-1 border border-red-200 rounded text-xs font-bold text-danger hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileManager;
