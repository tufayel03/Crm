
import React from 'react';
import { EditorBlock, GlobalStyle, Asset } from './types';
import { renderBlockContent } from './compiler';
import DropZone from './DropZone';
import { X, Trash2 } from 'lucide-react';

interface BlockRendererProps {
  block: EditorBlock;
  globalStyle: GlobalStyle;
  assets: Asset[];
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  deleteBlock: (id: string) => void;
  onDrop: (parentId: string | null, index: number, payload: any) => void;
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ 
  block, globalStyle, assets, activeBlockId, setActiveBlockId, deleteBlock, onDrop 
}) => {
  const isSelected = activeBlockId === block.id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBlock(block.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('dragType', 'move');
    e.dataTransfer.setData('blockId', block.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // --- COLUMNS RENDERING ---
  if (block.type === 'columns' && block.content.columns && block.content.layout) {
    return (
      <div 
        key={block.id}
        draggable
        onDragStart={handleDragStart}
        onClick={(e) => { e.stopPropagation(); setActiveBlockId(block.id); }}
        className={`relative mb-2 border-2 transition-all group ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary/30'}`}
      >
        {isSelected && (
          <button onClick={handleDelete} className="absolute -right-3 -top-3 bg-red-500 text-white p-1 rounded-full shadow-sm z-10">
             <X size={12} />
          </button>
        )}
        <div className="flex w-full" style={{ padding: block.style.padding }}>
          {block.content.columns.map((col, idx) => (
            <div key={idx} style={{ flex: block.content.layout![idx], minWidth: 0 }} className="outline-1 outline-dashed outline-gray-200 min-h-[50px] p-2 flex flex-col relative">
              
              {col.length === 0 ? (
                  // Empty state for column - Make DropZone full height
                  <div className="flex-1 w-full h-full relative min-h-[40px] flex items-center justify-center">
                      <DropZone parentId={block.id + '_col_' + idx} index={0} onDrop={onDrop} className="absolute inset-0 z-10" />
                      <span className="text-[10px] text-textMuted select-none pointer-events-none">Drop Content</span>
                  </div>
              ) : (
                  <>
                    <DropZone parentId={block.id + '_col_' + idx} index={0} onDrop={onDrop} />
                    {col.map((subBlock, subIdx) => (
                        <React.Fragment key={subBlock.id}>
                            <BlockRenderer 
                                block={subBlock} 
                                globalStyle={globalStyle} 
                                assets={assets}
                                activeBlockId={activeBlockId}
                                setActiveBlockId={setActiveBlockId}
                                deleteBlock={deleteBlock}
                                onDrop={onDrop}
                            />
                            <DropZone parentId={block.id + '_col_' + idx} index={subIdx + 1} onDrop={onDrop} />
                        </React.Fragment>
                    ))}
                  </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- DIV (CONTAINER) RENDERING ---
  if (block.type === 'div') {
    return (
      <div 
        key={block.id}
        draggable
        onDragStart={handleDragStart}
        onClick={(e) => { e.stopPropagation(); setActiveBlockId(block.id); }}
        className={`relative mb-2 border-2 transition-all min-h-[50px] flex flex-col ${isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-dashed border-gray-300 hover:border-primary/50'}`}
        style={{
           backgroundColor: block.style.backgroundColor,
           background: block.style.backgroundGradient ? block.style.backgroundGradient : undefined,
           backgroundImage: (!block.style.backgroundGradient && block.style.backgroundImage) ? `url(${block.style.backgroundImage})` : undefined,
           backgroundSize: block.style.backgroundSize || 'cover',
           backgroundPosition: block.style.backgroundPosition || 'center',
           backgroundRepeat: block.style.backgroundRepeat || 'no-repeat',
           padding: block.style.padding,
           height: block.style.height || 'auto',
           width: block.style.width || '100%',
           textAlign: block.style.textAlign,
        }}
      >
        {isSelected && (
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] px-2 py-1 rounded-bl">Div</div>
        )}
        {isSelected && (
            <button onClick={handleDelete} className="absolute -right-3 -top-3 bg-red-500 text-white p-1 rounded-full shadow-sm z-20">
                <Trash2 size={12} />
            </button>
        )}
        
        {/* Empty State Drop Zone or Nested Content */}
        {(!block.content.children || block.content.children.length === 0) ? (
             <div className="flex-1 w-full h-full min-h-[50px] relative flex items-center justify-center">
                  <DropZone parentId={block.id} index={0} onDrop={onDrop} className="absolute inset-0 z-10" />
                  <span className="text-[10px] text-textMuted select-none pointer-events-none">Empty Div</span>
             </div>
        ) : (
             <>
                <DropZone parentId={block.id} index={0} onDrop={onDrop} />
                {block.content.children.map((child, i) => (
                    <React.Fragment key={child.id}>
                        <BlockRenderer 
                           block={child}
                           globalStyle={globalStyle}
                           assets={assets}
                           activeBlockId={activeBlockId}
                           setActiveBlockId={setActiveBlockId}
                           deleteBlock={deleteBlock}
                           onDrop={onDrop}
                        />
                        <DropZone parentId={block.id} index={i + 1} onDrop={onDrop} />
                    </React.Fragment>
                ))}
             </>
        )}
      </div>
    );
  }

  // --- STANDARD BLOCKS ---
  const html = renderBlockContent(block, globalStyle, assets);

  return (
    <div 
      key={block.id}
      onClick={(e) => { e.stopPropagation(); setActiveBlockId(block.id); }}
      draggable
      onDragStart={handleDragStart}
      className={`relative group cursor-pointer border-2 transition-all ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary/30'}`}
    >
       {isSelected && (
          <div className="absolute -right-8 top-0 flex flex-col gap-1 z-10">
             <button onClick={handleDelete} className="p-1 bg-white border border-border rounded shadow hover:bg-red-50 text-danger"><Trash2 size={14}/></button>
          </div>
       )}
       <div dangerouslySetInnerHTML={{ __html: html }} className="pointer-events-none" />
    </div>
  );
};

export default BlockRenderer;
