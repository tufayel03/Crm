
import React, { useState, useRef, useEffect } from 'react';
import { Lead } from '../../types';
import { maskValue } from '../../utils/mockData';
import { CheckSquare, Square, Globe, Eye, ChevronRight, Copy, Edit2 } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

interface LeadsTableProps {
  leads: Lead[];
  pageStartIndex: number;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectPage: () => void;
  isPageSelected: boolean;
  onNavigate: (path: string) => void;
  onReveal: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  isAdmin: boolean;
  onEdit: (lead: Lead) => void; // New prop
}

const LeadsTable: React.FC<LeadsTableProps> = ({ 
  leads,
  pageStartIndex,
  selectedIds, 
  onToggleSelect, 
  onSelectPage, 
  isPageSelected, 
  onNavigate, 
  onReveal,
  onSelectionChange,
  isAdmin,
  onEdit
}) => {
  const { addNotification } = useNotificationStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const startPos = useRef<{x: number, y: number} | null>(null);
  
  // Scroll State
  const [scrollSpeed, setScrollSpeed] = useState(0);

  // Auto-scroll loop
  useEffect(() => {
    if (scrollSpeed === 0) return;
    let animationFrameId: number;

    const scrollContainer = document.querySelector('main'); // Target the main scrollable area in DashboardLayout
    if (!scrollContainer) return;

    const scroll = () => {
      scrollContainer.scrollBy(0, scrollSpeed);
      animationFrameId = requestAnimationFrame(scroll);
    };

    scroll();
    return () => cancelAnimationFrame(animationFrameId);
  }, [scrollSpeed]);

  // Handle Global Mouse Events for Dragging & Scrolling
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!startPos.current) return;

      // --- Auto Scroll Logic ---
      const viewportHeight = window.innerHeight;
      const edgeThreshold = 100; // px from edge to start scrolling
      
      if (e.clientY < edgeThreshold) {
        setScrollSpeed(-15); // Scroll Up
      } else if (e.clientY > viewportHeight - edgeThreshold) {
        setScrollSpeed(15); // Scroll Down
      } else {
        setScrollSpeed(0);
      }

      // --- Selection Logic ---
      const currentX = e.clientX;
      const currentY = e.clientY;
      const startX = startPos.current.x;
      const startY = startPos.current.y;

      // Calculate Box Dimensions (Visual only, relative to viewport)
      const x = Math.min(currentX, startX);
      const y = Math.min(currentY, startY);
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);

      setSelectionBox({ x, y, w, h });

      // Calculate Intersection with Rows
      // Note: We select based on the box covering the row visually
      const newSelectedIds: string[] = [];
      
      leads.forEach(lead => {
        const row = document.getElementById(`lead-row-${lead.id}`);
        if (row) {
          const rect = row.getBoundingClientRect();
          // Intersection Check
          const isIntersecting = x < rect.right && x + w > rect.left && y < rect.bottom && y + h > rect.top;
          
          if (isIntersecting) {
            newSelectedIds.push(lead.id);
          }
        }
      });

      if (newSelectedIds.length > 0) {
          // If holding CTRL (not implemented here), we would merge.
          // Currently replaces selection for standard "box select" feel.
          onSelectionChange(newSelectedIds);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setSelectionBox(null);
      setScrollSpeed(0);
      startPos.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setScrollSpeed(0); // Ensure scroll stops on cleanup
    };
  }, [isDragging, leads, onSelectionChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, input, a, select, [data-no-drag]')) {
        return;
    }
    if (e.button !== 0) return;

    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    
    // Clear selection on start of new drag unless holding modifiers
    if (!e.ctrlKey && !e.shiftKey) {
        onSelectionChange([]);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addNotification('success', 'Copied to clipboard.');
  };

  return (
    <div 
      ref={containerRef} 
      onMouseDown={handleMouseDown}
      className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm relative select-none"
    >
      {/* Selection Box Overlay */}
      {selectionBox && (
        <div 
          className="fixed bg-primary/20 border border-primary z-50 pointer-events-none"
          style={{ 
            left: selectionBox.x, 
            top: selectionBox.y, 
            width: selectionBox.w, 
            height: selectionBox.h 
          }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-border">
              <th className="px-4 py-4 w-10">
                <button onClick={onSelectPage} className="text-textMuted hover:text-primary transition-colors" data-no-drag>
                  {isPageSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-4 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">ID</th>
              <th className="px-4 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Lead Info</th>
              <th className="px-4 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Status</th>
              <th className="px-4 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Contact</th>
              <th className="px-4 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Agent</th>
              <th className="px-4 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead, idx) => (
              <tr 
                key={lead.id} 
                id={`lead-row-${lead.id}`}
                className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(lead.id) ? 'bg-softMint/20' : ''}`}
                onDoubleClick={() => handleCopy(`${lead.name} - ${lead.email} - ${lead.phone}`)}
                title="Double click to copy lead details"
              >
                <td className="px-4 py-4">
                  <button onClick={() => onToggleSelect(lead.id)} className="text-textMuted hover:text-primary transition-colors" data-no-drag>
                    {selectedIds.includes(lead.id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                  </button>
                </td>
                <td className="px-4 py-4 text-sm font-mono text-textSecondary pointer-events-none">
                  #{pageStartIndex + idx + 1}
                </td>
                <td className="px-4 py-4" onClick={() => onNavigate(`/leads/${lead.id}`)}>
                  <div className="flex items-center gap-3 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-softMint flex items-center justify-center text-darkGreen font-bold pointer-events-none">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-textPrimary hover:text-primary transition-colors">{lead.name}</p>
                      <p className="text-xs text-textSecondary flex items-center gap-1 pointer-events-none">
                        <Globe size={10} /> {lead.country}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 pointer-events-none">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${lead.status === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-success/10 text-success border-success/20'}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-4" onDoubleClick={(e) => { e.stopPropagation(); handleCopy(lead.email); }}>
                  <div className="space-y-0.5 cursor-text">
                    <p className="text-xs font-medium text-textSecondary cursor-copy select-none" title="Double click to copy email">{maskValue(lead.email, 'email', lead.isRevealed || isAdmin)}</p>
                    <p className="text-[10px] text-textMuted">{maskValue(lead.phone, 'phone', lead.isRevealed || isAdmin)}</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs font-medium text-textSecondary pointer-events-none">
                  {lead.assignedAgentName}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        className="p-1.5 text-textMuted hover:text-darkGreen" title="Edit"
                        data-no-drag
                    >
                        <Edit2 size={16} />
                    </button>
                    {!lead.isRevealed && !isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onReveal(lead.id); }}
                        className="p-1.5 text-textMuted hover:text-darkGreen" title="Reveal"
                        data-no-drag
                      >
                        <Eye size={16} />
                      </button>
                    )}
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleCopy(`${lead.name} ${lead.email} ${lead.phone}`); }}
                        className="p-1.5 text-textMuted hover:text-darkGreen" title="Copy Info"
                        data-no-drag
                      >
                        <Copy size={16} />
                      </button>
                    <button onClick={() => onNavigate(`/leads/${lead.id}`)} className="p-1.5 text-textMuted hover:text-darkGreen" data-no-drag>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center text-textMuted">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsTable;
