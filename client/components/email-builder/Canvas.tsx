
import React from 'react';
import { EditorBlock, GlobalStyle, Asset } from './types';
import BlockRenderer from './BlockRenderer';
import DropZone from './DropZone';
import { Layers } from 'lucide-react';

interface CanvasProps {
  blocks: EditorBlock[];
  globalStyle: GlobalStyle;
  assets: Asset[];
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  deleteBlock: (id: string) => void;
  previewMode: 'desktop' | 'mobile';
  onDrop: (parentId: string | null, index: number, payload: any) => void;
}

const Canvas: React.FC<CanvasProps> = ({ 
  blocks, globalStyle, assets, activeBlockId, setActiveBlockId, deleteBlock, previewMode, onDrop
}) => {
  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center" onClick={() => setActiveBlockId(null)}>
       <div 
          className="shadow-xl transition-all duration-300 min-h-[800px] rounded-lg flex flex-col relative"
          style={{ 
              width: previewMode === 'mobile' ? '375px' : `${globalStyle.contentWidth}px`, 
              backgroundColor: globalStyle.contentBackgroundColor,
              backgroundImage: globalStyle.backgroundImage ? `url(${globalStyle.backgroundImage})` : 'none',
              backgroundSize: 'cover'
          }}
       >
           {blocks.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                   <DropZone parentId={null} index={0} onDrop={onDrop} className="absolute inset-0 z-10 opacity-0" />
                   <div className="flex flex-col items-center justify-center text-textMuted opacity-50 pointer-events-none">
                        <Layers size={48}/>
                        <p className="mt-2 font-medium">Drag blocks here</p>
                   </div>
               </div>
           ) : (
               <>
                   <DropZone parentId={null} index={0} onDrop={onDrop} />
                   {blocks.map((block, i) => (
                       <React.Fragment key={block.id}>
                           <BlockRenderer 
                              block={block}
                              globalStyle={globalStyle}
                              assets={assets}
                              activeBlockId={activeBlockId}
                              setActiveBlockId={setActiveBlockId}
                              deleteBlock={deleteBlock}
                              onDrop={onDrop}
                           />
                           <DropZone parentId={null} index={i + 1} onDrop={onDrop} />
                       </React.Fragment>
                   ))}
               </>
           )}
       </div>
    </div>
  );
};

export default Canvas;
