
import React from 'react';
import { Archive, Loader2, Trash2 } from 'lucide-react';

interface ClientBulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  onExportZip: () => void;
  onDelete: () => void;
  isExporting: boolean;
  exportProgress?: number;
  exportStatus?: string;
}

const ClientBulkActions: React.FC<ClientBulkActionsProps> = ({ 
  selectedCount, onClear, onExportZip, onDelete, isExporting, exportProgress = 0, exportStatus
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white border border-border shadow-2xl rounded-2xl p-2 animate-in slide-in-from-bottom-4 fade-in duration-300 min-w-[320px]">
      <div className="flex items-center gap-4 px-2">
        <div className="flex items-center gap-2 pl-2 border-r border-border pr-4">
           <div className="bg-darkGreen text-white text-xs font-bold px-2 py-1 rounded-full">{selectedCount}</div>
           <span className="text-sm font-bold text-textPrimary">Selected</span>
        </div>
        
        <div className="flex gap-2 flex-1 justify-end">
          {!isExporting && (
            <button 
                onClick={onDelete}
                className="px-3 py-2 bg-red-50 text-danger text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
            >
                <Trash2 size={14} /> Delete
            </button>
          )}
          
          <button 
            onClick={onExportZip}
            disabled={isExporting}
            className={`relative overflow-hidden px-3 py-2 bg-slate-50 text-textPrimary text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2 disabled:opacity-100 disabled:cursor-wait ${isExporting ? 'w-48 justify-center' : ''}`}
          >
            {isExporting ? (
                <>
                    <div className="absolute left-0 top-0 bottom-0 bg-primary/20 transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                    <div className="relative z-10 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-darkGreen"/>
                        <span className="truncate max-w-[120px]">{exportStatus || `${exportProgress}%`}</span>
                    </div>
                </>
            ) : (
                <>
                    <Archive size={14} className="text-orange-500" />
                    Download Data (ZIP)
                </>
            )}
          </button>
        </div>

        <button onClick={onClear} disabled={isExporting} className="ml-2 text-xs text-textMuted hover:text-textPrimary hover:underline px-2 disabled:opacity-50">
          Clear
        </button>
      </div>
    </div>
  );
};

export default ClientBulkActions;
