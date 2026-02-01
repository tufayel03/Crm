
import React, { useState } from 'react';

interface ColorPickerProps {
  label: string;
  value?: string;
  gradientValue?: string;
  onChange: (color: string, gradient?: string) => void;
  allowGradient?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, gradientValue, onChange, allowGradient = false }) => {
  const [mode, setMode] = useState<'solid' | 'gradient'>(gradientValue ? 'gradient' : 'solid');
  
  // Gradient state
  const [gradStart, setGradStart] = useState('#ffffff');
  const [gradEnd, setGradEnd] = useState('#000000');
  const [gradDir, setGradDir] = useState('to bottom');

  const updateGradient = (start: string, end: string, dir: string) => {
    setGradStart(start);
    setGradEnd(end);
    setGradDir(dir);
    const gradString = `linear-gradient(${dir}, ${start}, ${end})`;
    onChange(start, gradString);
  };

  return (
    <div className="border-t border-border pt-2 mt-2">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-bold text-textSecondary">{label}</label>
        {allowGradient && (
          <div className="flex bg-slate-100 p-0.5 rounded">
            <button 
               onClick={() => { setMode('solid'); onChange(value || '#000000', undefined); }}
               className={`text-[10px] px-2 py-0.5 rounded ${mode === 'solid' ? 'bg-white shadow text-darkGreen' : 'text-textMuted'}`}
            >Solid</button>
            <button 
               onClick={() => { setMode('gradient'); updateGradient(gradStart, gradEnd, gradDir); }}
               className={`text-[10px] px-2 py-0.5 rounded ${mode === 'gradient' ? 'bg-white shadow text-darkGreen' : 'text-textMuted'}`}
            >Gradient</button>
          </div>
        )}
      </div>

      {mode === 'solid' ? (
        <div className="flex items-center gap-2">
           <input 
              type="color" 
              value={value || '#000000'} 
              onChange={(e) => onChange(e.target.value, undefined)} 
              className="w-8 h-8 rounded cursor-pointer border-none" 
            />
           <input 
              type="text" 
              value={value || ''} 
              onChange={(e) => onChange(e.target.value, undefined)}
              className="text-xs border border-border rounded p-1 flex-1 bg-white text-black"
              placeholder="#000000"
           />
        </div>
      ) : (
        <div className="space-y-2 bg-slate-50 p-2 rounded">
             <div className="flex gap-2 items-center">
                 <div className="flex flex-col flex-1">
                    <span className="text-[10px] text-textMuted">Start</span>
                    <input type="color" value={gradStart} onChange={(e) => updateGradient(e.target.value, gradEnd, gradDir)} className="w-full h-6 rounded" />
                 </div>
                 <div className="flex flex-col flex-1">
                    <span className="text-[10px] text-textMuted">End</span>
                    <input type="color" value={gradEnd} onChange={(e) => updateGradient(gradStart, e.target.value, gradDir)} className="w-full h-6 rounded" />
                 </div>
             </div>
             <div>
                 <select value={gradDir} onChange={(e) => updateGradient(gradStart, gradEnd, e.target.value)} className="w-full p-1 text-xs border rounded bg-white text-black">
                    <option value="to bottom">To Bottom ↓</option>
                    <option value="to top">To Top ↑</option>
                    <option value="to right">To Right →</option>
                    <option value="to left">To Left ←</option>
                    <option value="45deg">Diagonal 45°</option>
                 </select>
             </div>
        </div>
      )}
    </div>
  );
};
