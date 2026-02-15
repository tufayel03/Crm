import React from 'react';
import { Asset } from './types';
import { UploadCloud, Trash2, X } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { useNotificationStore } from '../../stores/notificationStore';

interface AssetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

const AssetManager: React.FC<AssetManagerProps> = ({ isOpen, onClose, assets, setAssets }) => {
  const { addNotification } = useNotificationStore();

  const toAbsoluteUrl = (url: string) => {
    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return url;
    }
  };

  const loadAssets = async () => {
    try {
      const files = await apiRequest<Array<{ path: string; name: string; url: string }>>('/api/v1/files?folder=email-assets');
      setAssets((prev) => {
        const byId = new Map(prev.map((asset) => [asset.id, asset]));
        const next = files.map((file) => {
          const existing = byId.get(file.path);
          const cleanName = (existing?.name || file.name.split('.')[0] || 'asset').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          return {
            id: file.path,
            name: cleanName,
            url: toAbsoluteUrl(file.url)
          };
        });
        return next;
      });
    } catch (err) {
      addNotification('error', err instanceof Error ? err.message : 'Failed to load assets.');
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    loadAssets();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'email-assets');
        const uploaded = await apiRequest<{ path: string; name: string; url: string }>('/api/v1/files/upload', {
          method: 'POST',
          body: formData
        });
        const rawName = uploaded.name.split('.')[0];
        const cleanName = rawName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        setAssets((prev) => {
          const withoutOld = prev.filter((asset) => asset.id !== uploaded.path);
          return [...withoutOld, { id: uploaded.path, name: cleanName, url: toAbsoluteUrl(uploaded.url) }];
        });
      }
      addNotification('success', 'Asset uploaded.');
      await loadAssets();
    } catch (err) {
      addNotification('error', err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      e.target.value = '';
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await apiRequest('/api/v1/files', {
        method: 'DELETE',
        body: JSON.stringify({ path: id })
      });
      setAssets((prev) => prev.filter((a) => a.id !== id));
      addNotification('success', 'Asset deleted.');
    } catch (err) {
      addNotification('error', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-textPrimary">Asset Manager</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="p-6 border-b border-border bg-slate-50">
          <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-primary/50 bg-white rounded-xl text-darkGreen font-bold cursor-pointer hover:bg-softMint/20 transition-all">
            <UploadCloud size={24} /> <span className="text-sm">Upload Images (Multi-select supported)</span>
            <input type="file" multiple accept=".png,.jpg,.jpeg,.svg,.svgz,.webp,.avif,.bmp,.ico,.tif,.tiff,.heic,.heif,.eps,.ai,image/*" onChange={handleAssetUpload} className="hidden" />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 grid grid-cols-2 md:grid-cols-3 gap-4">
          {assets.length === 0 && <p className="col-span-full text-center text-textMuted py-8">No assets uploaded yet.</p>}
          {assets.map(asset => (
            <div key={asset.id} className="bg-white p-2 rounded-lg shadow border border-border group relative">
              <div className="aspect-square bg-slate-100 mb-2 rounded overflow-hidden flex items-center justify-center">
                <img src={asset.url} alt={asset.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col gap-1">
                <input 
                  type="text" 
                  value={asset.name}
                  onChange={(e) => setAssets(assets.map(a => a.id === asset.id ? { ...a, name: e.target.value } : a))}
                  className="text-xs font-bold border border-border rounded px-1 w-full"
                />
                <div className="flex justify-between items-center mt-1">
                  <code className="text-[10px] bg-slate-100 p-1 rounded text-textSecondary truncate max-w-[80px]" title={`{{${asset.name}}}`}>{'{{'+asset.name+'}}'}</code>
                  <button onClick={() => deleteAsset(asset.id)} className="text-danger hover:bg-red-50 p-1 rounded"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-white border-t border-border text-xs text-textMuted">
          Tip: Use variable names (e.g. <code>{'{{logo}}'}</code>) in Custom HTML blocks or Image URLs.
        </div>
      </div>
    </div>
  );
};

export default AssetManager;
