
import React from 'react';
import { 
  Type, Image as ImageIcon, MousePointer2, MoreHorizontal, 
  Code, Layout, Minus, BoxSelect, UploadCloud, Square, List as ListIcon, BadgeCheck, Heading, AlignJustify
} from 'lucide-react';
import { BlockType } from './types';
import { ColorPicker } from './StyleControls';

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
  const handleGlobalImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'body' | 'content') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!ev.target?.result) return;
      if (target === 'body') {
        setGlobalStyle({ ...globalStyle, backgroundImage: ev.target.result as string, backgroundGradient: undefined });
      } else {
        setGlobalStyle({ ...globalStyle, contentBackgroundImage: ev.target.result as string, contentBackgroundGradient: undefined });
      }
    };
    reader.readAsDataURL(file);
  };
  
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
          <BlockButton icon={Heading} label="Header" type="header" />
          <BlockButton icon={ImageIcon} label="Image" type="image" />
          <BlockButton icon={MousePointer2} label="Button" type="button" />
          <BlockButton icon={BadgeCheck} label="Badge" type="badge" />
          <BlockButton icon={ListIcon} label="List" type="list" />
          <BlockButton icon={MoreHorizontal} label="Social" type="social" />
          <BlockButton icon={Minus} label="Divider" type="divider" />
          <BlockButton icon={BoxSelect} label="Spacer" type="spacer" />
          <BlockButton icon={Code} label="HTML" type="html" />
          <BlockButton icon={AlignJustify} label="Footer" type="footer" />
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
            <ColorPicker 
              label="Body Background"
              value={globalStyle.backgroundColor}
              gradientValue={globalStyle.backgroundGradient}
              allowGradient={true}
              onChange={(color, gradient) => setGlobalStyle({ ...globalStyle, backgroundColor: color, backgroundGradient: gradient })}
            />
          </div>
          <div>
             <label className="block text-xs font-bold text-textSecondary mb-1">Body Background Image</label>
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={globalStyle.backgroundImage || ''} 
                    onChange={(e) => setGlobalStyle({...globalStyle, backgroundImage: e.target.value, backgroundGradient: undefined})} 
                    className="flex-1 text-xs p-2 border border-border rounded"
                    placeholder="https://..."
                 />
                 <label className="p-2 bg-slate-100 border border-border rounded hover:bg-slate-200 cursor-pointer" title="Upload Image">
                    <UploadCloud size={16} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGlobalImageUpload(e, 'body')} />
                 </label>
                 <button onClick={onOpenAssetManager} className="p-2 bg-slate-100 border border-border rounded hover:bg-slate-200" title="Open Assets">
                    <UploadCloud size={16} />
                 </button>
             </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Content Width</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="content-full-width"
                type="checkbox"
                checked={globalStyle.contentFullWidth !== false}
                onChange={(e) => setGlobalStyle({ ...globalStyle, contentFullWidth: e.target.checked })}
              />
              <label htmlFor="content-full-width" className="text-xs text-textSecondary">
                Full width
              </label>
            </div>
            <input
              type="range"
              min="400"
              max="900"
              value={globalStyle.contentWidth}
              onChange={(e) => setGlobalStyle({ ...globalStyle, contentWidth: parseInt(e.target.value) })}
              className="w-full"
              disabled={globalStyle.contentFullWidth !== false}
            />
            <span className="text-xs text-textMuted">
              {globalStyle.contentFullWidth !== false ? 'Full width' : `${globalStyle.contentWidth}px`}
            </span>
          </div>
           <div>
            <ColorPicker 
              label="Content Background"
              value={globalStyle.contentBackgroundColor}
              gradientValue={globalStyle.contentBackgroundGradient}
              allowGradient={true}
              onChange={(color, gradient) => setGlobalStyle({ ...globalStyle, contentBackgroundColor: color, contentBackgroundGradient: gradient })}
            />
          </div>
          <div>
             <label className="block text-xs font-bold text-textSecondary mb-1">Content Background Image</label>
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={globalStyle.contentBackgroundImage || ''} 
                    onChange={(e) => setGlobalStyle({...globalStyle, contentBackgroundImage: e.target.value, contentBackgroundGradient: undefined})} 
                    className="flex-1 text-xs p-2 border border-border rounded"
                    placeholder="https://..."
                 />
                 <label className="p-2 bg-slate-100 border border-border rounded hover:bg-slate-200 cursor-pointer" title="Upload Image">
                    <UploadCloud size={16} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGlobalImageUpload(e, 'content')} />
                 </label>
                 <button onClick={onOpenAssetManager} className="p-2 bg-slate-100 border border-border rounded hover:bg-slate-200" title="Open Assets">
                    <UploadCloud size={16} />
                 </button>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Toolbox;
