
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
  duplicateBlock: (id: string) => void;
  moveBlockUp: (id: string) => void;
  moveBlockDown: (id: string) => void;
  previewMode: 'desktop' | 'mobile';
  onDrop: (parentId: string | null, index: number, payload: any) => void;
}

const Canvas: React.FC<CanvasProps> = ({ 
  blocks, globalStyle, assets, activeBlockId, setActiveBlockId, deleteBlock, duplicateBlock, moveBlockUp, moveBlockDown, previewMode, onDrop
}) => {
  const resolveAssetUrl = (value?: string) => {
    if (!value) return undefined;
    const match = value.match(/^{{\s*([^}]+)\s*}}$/);
    if (!match) return value;
    const name = match[1].trim();
    const asset = assets.find(a => a.name === name);
    return asset?.url || value;
  };

  const bodyBackground = globalStyle.backgroundGradient
    ? globalStyle.backgroundGradient
    : globalStyle.backgroundColor;

  const contentBackground = globalStyle.contentBackgroundGradient
    ? globalStyle.contentBackgroundGradient
    : globalStyle.contentBackgroundColor;

  const contentBgImage = resolveAssetUrl(globalStyle.contentBackgroundImage)
    ? `url(${resolveAssetUrl(globalStyle.contentBackgroundImage)})`
    : 'none';

  const contentWidth = globalStyle.contentFullWidth
    ? '100%'
    : `${globalStyle.contentWidth}px`;

  return (
    <div
      className="flex-1 overflow-y-auto no-scrollbar p-8 flex justify-center"
      onClick={() => setActiveBlockId(null)}
      style={{
        background: bodyBackground,
        backgroundImage: globalStyle.backgroundGradient ? undefined : (resolveAssetUrl(globalStyle.backgroundImage) ? `url(${resolveAssetUrl(globalStyle.backgroundImage)})` : undefined),
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top center'
      }}
    >
       <div 
          className="shadow-xl transition-all duration-300 min-h-[800px] rounded-lg flex flex-col relative"
          style={{ 
              width: globalStyle.contentFullWidth ? (previewMode === 'mobile' ? '375px' : '100%') : (previewMode === 'mobile' ? '375px' : contentWidth),
              maxWidth: previewMode === 'mobile' ? '375px' : contentWidth,
              background: contentBackground,
              backgroundImage: globalStyle.contentBackgroundGradient ? undefined : contentBgImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
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
                              onDuplicate={duplicateBlock}
                              onMoveUp={moveBlockUp}
                              onMoveDown={moveBlockDown}
                              previewMode={previewMode}
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
