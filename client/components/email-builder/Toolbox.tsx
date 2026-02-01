
import React from 'react';
import { 
  Type, Image as ImageIcon, MousePointer2, MoreHorizontal, 
  Code, Layout, Minus, BoxSelect, UploadCloud, Square
} from 'lucide-react';
import { BlockType } from './types';

interface ToolboxProps {
  onAddBlock: (type: BlockType, layout?: number[]) => void;
  globalStyle: any;
  setGlobalStyle: (s: any) => void;
  onOpenAssetManager: () => void;
}

const FONT_FAMILIES = [
  { label: 'Arial (Sans)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana (Sans)', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Times New Roman (Serif)', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, serif' },
  { label: 'Courier New (Mono)', value: '"Courier New", Courier, monospace' },
  { label: 'Tahoma (Sans)', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS (Sans)', value: '"Trebuchet MS", Helvetica, sans-serif' },
];

const Toolbox: React.FC<ToolboxProps> = ({ onAddBlock, globalStyle, setGlobalStyle, onOpenAssetManager }) => {
  
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const BlockButton = ({ icon: Icon, label, type }: { icon: any, label: string, type: BlockType }) => (
    <div 
        draggable
        onDragStart={(e) => handleDragStart(e, type)}
        onClick={() => onAddBlock(type)}
        className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-softMint border border-border hover:border-primary rounded-xl transition-all group cursor-grab active:cursor-grabbing"
    >
      <Icon size={24} className="text-textSecondary group-hover:text-darkGreen mb-2" />
      <span className="text-xs font-bold text-textPrimary">{label}</span>
    </div>
  );

  const LayoutButton = ({ ratios, label }: { ratios: number[], label: string }) => (
    <button onClick={() => onAddBlock('columns', ratios)} className="flex flex-col items-center justify-center p-2 bg-white border border-border hover:border-primary rounded-lg transition-all" title={label}>
      <div className="flex gap-1 w-full h-8 mb-1">
        {ratios.map((r, i) => (
          <div key={i} className="bg-slate-200 border border-slate-300 rounded-sm" style={{ flex: r }}></div>
        ))}
      </div>
      <span className="text-[10px] font-semibold text-textSecondary">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      
      {/* Basic Content Blocks */}
      <div>
        <h3 className="text-xs font-bold text-textMuted uppercase mb-3">Drag Blocks</h3>
        <div className="grid grid-cols-2 gap-3">
          <BlockButton icon={Square} label="Div" type="div" />
          <BlockButton icon={Type} label="Text" type="text" />
          <BlockButton icon={ImageIcon} label="Image" type="image" />
          <BlockButton icon={MousePointer2} label="Button" type="button" />
          <BlockButton icon={MoreHorizontal} label="Social" type="social" />
          <BlockButton icon={Minus} label="Divider" type="divider" />
          <BlockButton icon={BoxSelect} label="Spacer" type="spacer" />
          <BlockButton icon={Code} label="HTML" type="html" />
        </div>
      </div>

      {/* Layout Columns */}
      <div className="pt-6 border-t border-border">
        <h3 className="text-xs font-bold text-textMuted uppercase mb-3">Columns (Click to Add)</h3>
        <div className="grid grid-cols-3 gap-2">
          <LayoutButton ratios={[1]} label="1 Col" />
          <LayoutButton ratios={[1, 1]} label="2 Col" />
          <LayoutButton ratios={[1, 1, 1]} label="3 Col" />
          <LayoutButton ratios={[1, 2]} label="1:2" />
          <LayoutButton ratios={[2, 1]} label="2:1" />
          <LayoutButton ratios={[1, 3]} label="1:3" />
          <LayoutButton ratios={[3, 1]} label="3:1" />
          <LayoutButton ratios={[1, 1, 1, 1]} label="4 Col" />
        </div>
      </div>

      {/* Global Settings */}
      <div className="pt-6 border-t border-border">
        <h3 className="text-xs font-bold text-textMuted uppercase mb-3">Global Styles</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Default Font</label>
            <select 
                value={globalStyle.fontFamily} 
                onChange={(e) => setGlobalStyle({...globalStyle, fontFamily: e.target.value})}
                className="w-full text-xs p-2 bg-slate-50 border border-border rounded outline-none"
            >
                {FONT_FAMILIES.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Body Background</label>
            <div className="flex items-center gap-2">
               <input type="color" value={globalStyle.backgroundColor} onChange={(e) => setGlobalStyle({...globalStyle, backgroundColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-none" />
               <input type="text" value={globalStyle.backgroundColor} readOnly className="flex-1 text-xs border border-border p-1 rounded bg-slate-50" />
            </div>
          </div>
          <div>
             <label className="block text-xs font-bold text-textSecondary mb-1">Background Image URL</label>
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={globalStyle.backgroundImage || ''} 
                    onChange={(e) => setGlobalStyle({...globalStyle, backgroundImage: e.target.value})} 
                    className="flex-1 text-xs p-2 border border-border rounded"
                    placeholder="https://..."
                 />
                 <button onClick={onOpenAssetManager} className="p-2 bg-slate-100 border border-border rounded hover:bg-slate-200" title="Open Assets">
                    <UploadCloud size={16} />
                 </button>
             </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Content Width</label>
            <input type="range" min="400" max="800" value={globalStyle.contentWidth} onChange={(e) => setGlobalStyle({...globalStyle, contentWidth: parseInt(e.target.value)})} className="w-full" />
            <span className="text-xs text-textMuted">{globalStyle.contentWidth}px</span>
          </div>
           <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Content Background</label>
            <div className="flex items-center gap-2">
               <input type="color" value={globalStyle.contentBackgroundColor} onChange={(e) => setGlobalStyle({...globalStyle, contentBackgroundColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-none" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Toolbox;
