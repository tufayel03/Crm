
import React from 'react';
import { Trash2, UserPlus, CheckSquare } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onStatusChange: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ 
  selectedCount, onClear, onDelete, onAssign, onStatusChange 
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white border border-border shadow-2xl rounded-2xl p-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-4 px-2">
        <div className="flex items-center gap-2 pl-2 border-r border-border pr-4">
           <div className="bg-darkGreen text-white text-xs font-bold px-2 py-1 rounded-full">{selectedCount}</div>
           <span className="text-sm font-bold text-textPrimary">Selected</span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={onDelete}
            className="px-3 py-2 bg-red-50 text-danger text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button 
            onClick={onAssign}
            className="px-3 py-2 bg-slate-50 text-textPrimary text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <UserPlus size={14} /> Assign Agent
          </button>
          <button 
            onClick={onStatusChange}
            className="px-3 py-2 bg-slate-50 text-textPrimary text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <CheckSquare size={14} /> Update Status
          </button>
        </div>

        <button onClick={onClear} className="ml-2 text-xs text-textMuted hover:text-textPrimary hover:underline px-2">
          Clear
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
