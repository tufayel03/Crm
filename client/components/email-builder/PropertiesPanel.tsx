
import React, { useState } from 'react';
import { EditorBlock, SocialItem } from './types';
import { 
  AlignLeft, AlignCenter, AlignRight, UploadCloud, 
  Trash2, Plus, GripVertical 
} from 'lucide-react';
import { ColorPicker } from './StyleControls';

interface PropertiesPanelProps {
  block: EditorBlock;
  onUpdateContent: (id: string, content: any) => void;
  onUpdateStyle: (id: string, style: any) => void;
  onClose: () => void;
}

const VARIABLES = [
  { label: 'Company Logo', value: '{{company_logo}}' },
  { label: 'Company Name', value: '{{company_name}}' },
  { label: 'Company Addr', value: '{{company_address}}' }, // New
  { label: 'Company Phone', value: '{{company_phone}}' }, // New
  { label: 'Company Web', value: '{{company_website}}' }, // New
  { label: 'Full Name', value: '{{lead_name}}' },
  { label: 'First Name', value: '{{lead_first_name}}' },
  { label: 'Unsubscribe', value: '{{unsubscribe_link}}' },
  // Invoice Vars
  { label: 'Client Name', value: '{{client_name}}' },
  { label: 'Invoice ID', value: '{{invoice_id}}' },
  { label: 'Amount', value: '{{amount}}' },
  { label: 'Due Date', value: '{{due_date}}' },
  { label: 'Service', value: '{{service}}' },
  // Meeting Vars
  { label: 'Mtg Title', value: '{{meeting_title}}' },
  { label: 'Mtg Time', value: '{{time}}' },
  { label: 'Mtg Date', value: '{{date}}' },
  { label: 'Mtg Link', value: '{{link}}' },
  { label: 'Host Name', value: '{{host_name}}' },
];

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
];

const SOCIAL_NETWORKS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' }
];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ block, onUpdateContent, onUpdateStyle, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isBg: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, isBg);
  };

  const processFile = (file: File, isBg: boolean) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          if (isBg) {
             onUpdateStyle(block.id, { backgroundImage: ev.target.result });
             onUpdateStyle(block.id, { backgroundGradient: undefined }); 
          } else {
             onUpdateContent(block.id, { url: ev.target.result });
          }
        }
      };
      reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, isBg: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], isBg);
    }
  };

  // --- Social Media Handlers ---
  const addSocialLink = () => {
    const currentLinks = block.content.socialLinks || [];
    const newLink: SocialItem = {
      id: Math.random().toString(36).substr(2, 5),
      network: 'facebook',
      url: 'https://facebook.com/'
    };
    onUpdateContent(block.id, { socialLinks: [...currentLinks, newLink] });
  };

  const updateSocialLink = (id: string, field: keyof SocialItem, value: string) => {
    const currentLinks = block.content.socialLinks || [];
    const updated = currentLinks.map(l => l.id === id ? { ...l, [field]: value } : l);
    onUpdateContent(block.id, { socialLinks: updated });
  };

  const removeSocialLink = (id: string) => {
    const currentLinks = block.content.socialLinks || [];
    onUpdateContent(block.id, { socialLinks: currentLinks.filter(l => l.id !== id) });
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center mb-2 pb-4 border-b border-border">
          <h3 className="text-sm font-bold text-textPrimary capitalize">Edit {block.type}</h3>
          <button onClick={onClose} className="text-xs text-primary font-bold">Done</button>
       </div>

       {/* --- DIV (CONTAINER) --- */}
       {block.type === 'div' && (
         <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Dimensions</label>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <span className="text-[10px] text-textMuted uppercase">Width</span>
                      <input type="text" value={block.style.width || ''} onChange={(e) => onUpdateStyle(block.id, { width: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" placeholder="100%" />
                   </div>
                   <div>
                      <span className="text-[10px] text-textMuted uppercase">Height</span>
                      <input type="text" value={block.style.height || ''} onChange={(e) => onUpdateStyle(block.id, { height: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" placeholder="auto" />
                   </div>
                </div>
             </div>
             
             <ColorPicker 
               label="Background" 
               value={block.style.backgroundColor} 
               gradientValue={block.style.backgroundGradient}
               allowGradient={true}
               onChange={(color, gradient) => onUpdateStyle(block.id, { backgroundColor: color, backgroundGradient: gradient })}
             />

             <div className="border-t border-border pt-2">
                <label className="block text-xs font-bold text-textSecondary mb-1">Background Image</label>
                 <label 
                    className={`flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-lg font-bold cursor-pointer transition-all mb-2 ${dragActive ? 'border-primary bg-softMint/40' : 'border-border bg-slate-50'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, true)}
                 >
                    <UploadCloud size={16} className={dragActive ? 'text-primary' : 'text-textMuted'} /> 
                    <span className="text-xs text-textSecondary">{dragActive ? 'Drop image here' : 'Upload or Drop'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                </label>
                <input 
                  type="text" 
                  value={block.style.backgroundImage || ''} 
                  onChange={(e) => onUpdateStyle(block.id, { backgroundImage: e.target.value, backgroundGradient: undefined })} 
                  className="w-full p-2 border rounded text-xs bg-white text-black" 
                  placeholder="Image URL..." 
                />
             </div>
         </div>
       )}

       {/* --- TEXT --- */}
       {block.type === 'text' && (
         <div className="space-y-4">
            <label className="block text-xs font-bold text-textSecondary">Content</label>
            <textarea 
               rows={6}
               value={block.content.text}
               onChange={(e) => onUpdateContent(block.id, { text: e.target.value })}
               className="w-full p-2 bg-white text-black border border-border rounded text-sm font-mono"
            />
            <div className="flex flex-wrap gap-2">
                {VARIABLES.map(v => (
                    <button 
                        key={v.value} 
                        onClick={() => onUpdateContent(block.id, { text: (block.content.text || '') + v.value })}
                        className="text-[10px] bg-slate-100 border border-border px-2 py-1 rounded hover:bg-slate-200"
                    >
                        {v.label}
                    </button>
                ))}
            </div>
            
            <ColorPicker 
               label="Text Color" 
               value={block.style.color} 
               gradientValue={block.style.textGradient} 
               allowGradient={true}
               onChange={(color, gradient) => onUpdateStyle(block.id, { color: color, textGradient: gradient })}
            />

            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Size (px)</label>
                <input type="number" value={block.style.fontSize} onChange={(e) => onUpdateStyle(block.id, { fontSize: parseInt(e.target.value) })} className="w-full p-1 border rounded bg-white text-black" />
            </div>

            <div>
                 <label className="block text-xs font-bold text-textSecondary mb-1">Font Family</label>
                 <select 
                    value={block.style.fontFamily || ''}
                    onChange={(e) => onUpdateStyle(block.id, { fontFamily: e.target.value })}
                    className="w-full p-2 bg-white text-black border border-border rounded text-xs"
                 >
                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                 </select>
            </div>
         </div>
       )}

       {/* --- HTML (CUSTOM CODE) --- */}
       {block.type === 'html' && (
          <div className="space-y-4">
              <label className="block text-xs font-bold text-textSecondary">Custom HTML Code</label>
              <textarea 
                  rows={12}
                  value={block.content.html}
                  onChange={(e) => onUpdateContent(block.id, { html: e.target.value })}
                  className="w-full p-3 bg-[#1e1e1e] text-white border border-border rounded-lg text-xs font-mono leading-relaxed"
                  spellCheck={false}
                  placeholder="<div>Enter your HTML here...</div>"
              />
          </div>
       )}

       {/* --- IMAGE --- */}
       {block.type === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Upload Image</label>
              <label 
                  className={`flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg font-bold cursor-pointer transition-all ${dragActive ? 'border-primary bg-softMint/40' : 'border-border bg-slate-50'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, false)}
              >
                  <UploadCloud size={16} className={dragActive ? 'text-primary' : 'text-textMuted'} /> 
                  <span className="text-xs text-textSecondary">{dragActive ? 'Drop image here' : 'Upload or Drag & Drop'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-textSecondary mb-1">Or Image URL</label>
              <input type="text" value={block.content.url} onChange={(e) => onUpdateContent(block.id, { url: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-textSecondary mb-1">Width</label>
                    <input type="text" value={block.style.width || block.content.width} onChange={(e) => onUpdateStyle(block.id, { width: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" placeholder="100%" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-textSecondary mb-1">Height</label>
                    <input type="text" value={block.style.height || 'auto'} onChange={(e) => onUpdateStyle(block.id, { height: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" placeholder="auto" />
                </div>
            </div>
          </div>
       )}

       {/* --- SOCIAL MEDIA --- */}
       {block.type === 'social' && (
         <div className="space-y-4">
            <div className="space-y-3">
              {(block.content.socialLinks || []).map((link, idx) => (
                <div key={link.id} className="p-3 border border-border rounded-lg bg-slate-50 space-y-2">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-textMuted cursor-grab" />
                        <select 
                          value={link.network}
                          onChange={(e) => updateSocialLink(link.id, 'network', e.target.value)}
                          className="bg-white text-black border border-border rounded text-xs px-2 py-1 outline-none"
                        >
                          {SOCIAL_NETWORKS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                        </select>
                      </div>
                      <button onClick={() => removeSocialLink(link.id)} className="text-textMuted hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                   </div>
                   <input 
                     type="text" 
                     value={link.url}
                     onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                     className="w-full text-xs p-2 border border-border rounded bg-white text-black"
                     placeholder="https://..."
                   />
                </div>
              ))}
            </div>
            
            <button 
              onClick={addSocialLink} 
              className="w-full py-2 border border-dashed border-primary text-primary font-bold rounded-lg hover:bg-softMint/30 text-xs flex items-center justify-center gap-1"
            >
              <Plus size={14} /> Add another social link
            </button>
         </div>
       )}

       {/* --- SPACER --- */}
       {block.type === 'spacer' && (
          <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Height (px)</label>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={block.content.height || 20} 
                  onChange={(e) => onUpdateContent(block.id, { height: parseInt(e.target.value) })} 
                  className="w-full"
                />
                <div className="text-right text-xs text-textMuted">{block.content.height || 20}px</div>
             </div>
          </div>
       )}

       {/* --- DIVIDER --- */}
       {block.type === 'divider' && (
          <div className="space-y-4">
             <ColorPicker 
               label="Line Color" 
               value={block.style.color} 
               onChange={(color) => onUpdateStyle(block.id, { color })}
            />
          </div>
       )}

       {/* --- BUTTON --- */}
       {block.type === 'button' && (
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-textSecondary mb-1">Button Text</label>
                  <input type="text" value={block.content.text} onChange={(e) => onUpdateContent(block.id, { text: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-textSecondary mb-1">Link URL</label>
                  <input type="text" value={block.content.url} onChange={(e) => onUpdateContent(block.id, { url: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" />
               </div>
               
               <ColorPicker 
                 label="Background" 
                 value={block.style.backgroundColor} 
                 gradientValue={block.style.backgroundGradient}
                 allowGradient={true}
                 onChange={(color, gradient) => onUpdateStyle(block.id, { backgroundColor: color, backgroundGradient: gradient })}
               />

               <ColorPicker 
                 label="Text Color" 
                 value={block.style.color} 
                 gradientValue={block.style.textGradient}
                 allowGradient={true}
                 onChange={(color, gradient) => onUpdateStyle(block.id, { color: color, textGradient: gradient })}
               />

              <div>
                  <label className="block text-xs font-bold text-textSecondary mb-1">Border Radius</label>
                  <input type="range" min="0" max="30" value={block.style.borderRadius} onChange={(e) => onUpdateStyle(block.id, { borderRadius: parseInt(e.target.value) })} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-textSecondary mb-1">Width (e.g. 200px, 50%)</label>
                    <input type="text" value={block.style.width || ''} onChange={(e) => onUpdateStyle(block.id, { width: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" placeholder="Auto" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-textSecondary mb-1">Height (e.g. 50px)</label>
                    <input type="text" value={block.style.height || ''} onChange={(e) => onUpdateStyle(block.id, { height: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" placeholder="Auto" />
                </div>
            </div>
            <div>
                 <label className="block text-xs font-bold text-textSecondary mb-1">Font Family</label>
                 <select 
                    value={block.style.fontFamily || ''}
                    onChange={(e) => onUpdateStyle(block.id, { fontFamily: e.target.value })}
                    className="w-full p-2 bg-white text-black border border-border rounded text-xs"
                 >
                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                 </select>
            </div>
          </div>
       )}

       {/* --- COMMON STYLES --- */}
       <div className="pt-4 border-t border-border space-y-4">
          <h4 className="text-xs font-bold text-textMuted uppercase">Spacing & Layout</h4>
          
          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Padding (e.g. 10px 20px)</label>
            <input type="text" value={block.style.padding} onChange={(e) => onUpdateStyle(block.id, { padding: e.target.value })} className="w-full p-2 border rounded text-sm bg-white text-black" placeholder="20px or 10px 20px" />
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Align</label>
            <div className="flex bg-slate-50 border border-border rounded p-1">
                <button onClick={() => onUpdateStyle(block.id, { textAlign: 'left' })} className={`flex-1 p-1 rounded ${block.style.textAlign === 'left' ? 'bg-white shadow' : ''}`}><AlignLeft size={16} className="mx-auto" /></button>
                <button onClick={() => onUpdateStyle(block.id, { textAlign: 'center' })} className={`flex-1 p-1 rounded ${block.style.textAlign === 'center' ? 'bg-white shadow' : ''}`}><AlignCenter size={16} className="mx-auto" /></button>
                <button onClick={() => onUpdateStyle(block.id, { textAlign: 'right' })} className={`flex-1 p-1 rounded ${block.style.textAlign === 'right' ? 'bg-white shadow' : ''}`}><AlignRight size={16} className="mx-auto" /></button>
            </div>
          </div>
       </div>

    </div>
  );
};

export default PropertiesPanel;
