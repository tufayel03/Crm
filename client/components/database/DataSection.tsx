
import React, { useState, useRef } from 'react';
import { Database, Trash2, AlertTriangle, CheckCircle2, HardDrive, Download, Upload, FileJson } from 'lucide-react';

interface DataSectionProps {
  title: string;
  description: string;
  count: number;
  data: any;
  onPurge: () => void | Promise<void>;
  onExport?: () => void;
  onImport?: (file: File) => void;
  icon: React.ElementType;
  itemName: string;
}

const DataSection: React.FC<DataSectionProps> = ({ 
  title, description, count, data, onPurge, onExport, onImport, icon: Icon, itemName 
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedSize = (JSON.stringify(data).length / 1024).toFixed(2); // KB approximation

  const handlePurge = () => {
    onPurge();
    setIsConfirming(false);
    setSuccessMsg(`All ${itemName} have been successfully deleted.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
        onImport(file);
        setSuccessMsg(`${itemName} import processed successfully.`);
        setTimeout(() => setSuccessMsg(''), 5000);
    }
    // Reset
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-border">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <Icon size={20} className="text-primary" /> {title}
            </h3>
        </div>
        <p className="text-sm text-textSecondary mb-6">
          {description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-50 border border-border rounded-xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg border border-border text-blue-600">
                    <Database size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-textMuted uppercase">Total {itemName}</p>
                    <p className="text-2xl font-bold text-textPrimary">{count.toLocaleString()}</p>
                </div>
            </div>
            <div className="p-4 bg-slate-50 border border-border rounded-xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg border border-border text-purple-600">
                    <HardDrive size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-textMuted uppercase">Storage Used (Est.)</p>
                    <p className="text-2xl font-bold text-textPrimary">{estimatedSize} KB</p>
                </div>
            </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row gap-6">
            
            {/* Portability */}
            {(onExport || onImport) && (
                <div className="flex-1 border border-border rounded-xl overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b border-border flex items-center gap-2">
                        <FileJson size={18} className="text-textSecondary" />
                        <h4 className="font-bold text-sm text-textPrimary">Data Portability</h4>
                    </div>
                    <div className="p-4 bg-white flex gap-3">
                        {onExport && (
                            <button 
                                onClick={onExport}
                                className="flex-1 px-3 py-2 bg-white border border-border text-textPrimary text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Export JSON
                            </button>
                        )}
                        {onImport && (
                            <>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                <button 
                                    onClick={handleImportClick}
                                    className="flex-1 px-3 py-2 bg-white border border-border text-textPrimary text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload size={14} /> Import JSON
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Danger Zone */}
            <div className="flex-1 border border-red-200 rounded-xl overflow-hidden">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-danger" />
                    <h4 className="font-bold text-sm text-danger">Danger Zone</h4>
                </div>
                
                <div className="p-4 bg-white flex items-center justify-between">
                    {!isConfirming ? (
                        <div className="w-full">
                            <button 
                                onClick={() => setIsConfirming(true)}
                                disabled={count === 0}
                                className="w-full px-4 py-2 bg-white border border-red-200 text-danger font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                <Trash2 size={14} /> Purge All Data
                            </button>
                        </div>
                    ) : (
                        <div className="w-full flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <button 
                                onClick={() => setIsConfirming(false)}
                                className="flex-1 px-3 py-2 bg-slate-100 text-textSecondary text-xs font-bold rounded-lg hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handlePurge}
                                className="flex-[2] px-3 py-2 bg-danger text-white text-xs font-bold rounded-lg hover:bg-red-600 shadow-md shadow-red-100"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {successMsg && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 size={18} /> {successMsg}
            </div>
        )}

      </div>
    </div>
  );
};

export default DataSection;
