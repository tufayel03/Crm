import React from 'react';
import { Asset } from './types';
import { UploadCloud, Trash2, X } from 'lucide-react';

interface AssetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

const AssetManager: React.FC<AssetManagerProps> = ({ isOpen, onClose, assets, setAssets }) => {
  if (!isOpen) return null;

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            const rawName = file.name.split('.')[0];
            const cleanName = rawName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            setAssets(prev => [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              name: cleanName,
              url: ev.target!.result as string
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const deleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
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
            <input type="file" multiple accept="image/*" onChange={handleAssetUpload} className="hidden" />
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