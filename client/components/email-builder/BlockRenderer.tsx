
import React from 'react';
import { EditorBlock, GlobalStyle, Asset } from './types';
import { renderBlockContent } from './compiler';
import DropZone from './DropZone';
import { X, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';

interface BlockRendererProps {
  block: EditorBlock;
  globalStyle: GlobalStyle;
  assets: Asset[];
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  deleteBlock: (id: string) => void;
  onDrop: (parentId: string | null, index: number, payload: any) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  previewMode?: 'desktop' | 'mobile';
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ 
  block, globalStyle, assets, activeBlockId, setActiveBlockId, deleteBlock, onDrop, onDuplicate, onMoveUp, onMoveDown, previewMode = 'desktop'
}) => {
  const isSelected = activeBlockId === block.id;
  const marginStyle = block.style.margin
    ? block.style.margin
    : (typeof block.style.marginTop === 'number' &&
      typeof block.style.marginRight === 'number' &&
      typeof block.style.marginBottom === 'number' &&
      typeof block.style.marginLeft === 'number')
        ? `${block.style.marginTop}px ${block.style.marginRight}px ${block.style.marginBottom}px ${block.style.marginLeft}px`
        : undefined;

  const isMobile = previewMode === 'mobile';
  const effectivePadding = isMobile && block.style.mobilePadding ? block.style.mobilePadding : block.style.padding;
  const effectiveMargin = isMobile && block.style.mobileMargin ? block.style.mobileMargin : marginStyle;
  const effectiveTextAlign = isMobile && block.style.mobileTextAlign ? block.style.mobileTextAlign : block.style.textAlign;
  const effectiveWidth = isMobile && block.style.mobileWidth ? block.style.mobileWidth : block.style.width;
  const effectiveHeight = isMobile && block.style.mobileHeight ? block.style.mobileHeight : block.style.height;
  const effectiveBorderRadius = isMobile && typeof block.style.mobileBorderRadius === 'number' ? block.style.mobileBorderRadius : block.style.borderRadius;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBlock(block.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(block.id);
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveUp(block.id);
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveDown(block.id);
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
        style={{ margin: effectiveMargin }}
      >
        {isSelected && (
          <div className="absolute -right-3 -top-3 flex flex-col gap-1 z-10">
             <button onClick={handleDuplicate} className="bg-white border border-border text-textSecondary p-1 rounded-full shadow-sm hover:bg-slate-50">
                <Copy size={12} />
             </button>
             <button onClick={handleMoveUp} className="bg-white border border-border text-textSecondary p-1 rounded-full shadow-sm hover:bg-slate-50">
                <ChevronUp size={12} />
             </button>
             <button onClick={handleMoveDown} className="bg-white border border-border text-textSecondary p-1 rounded-full shadow-sm hover:bg-slate-50">
                <ChevronDown size={12} />
             </button>
             <button onClick={handleDelete} className="bg-red-500 text-white p-1 rounded-full shadow-sm">
                <X size={12} />
             </button>
          </div>
        )}
        <div className="flex w-full" style={{ padding: effectivePadding }}>
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
                                onDuplicate={onDuplicate}
                                onMoveUp={onMoveUp}
                                onMoveDown={onMoveDown}
                                previewMode={previewMode}
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
        className={`relative mb-2 border-2 transition-all min-h-[50px] flex flex-col ${isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-transparent hover:border-primary/30'}`}
        style={{
           backgroundColor: block.style.backgroundColor,
           background: block.style.backgroundGradient ? block.style.backgroundGradient : undefined,
           backgroundImage: (!block.style.backgroundGradient && block.style.backgroundImage) ? `url(${block.style.backgroundImage})` : undefined,
           backgroundSize: block.style.backgroundSize || 'cover',
           backgroundPosition: block.style.backgroundPosition || 'center',
           backgroundRepeat: block.style.backgroundRepeat || 'no-repeat',
           padding: effectivePadding,
           border: block.style.border,
           borderRadius: effectiveBorderRadius,
           boxShadow: block.style.boxShadow,
           height: effectiveHeight || 'auto',
           width: effectiveWidth || '100%',
           textAlign: effectiveTextAlign,
           margin: effectiveMargin,
        }}
      >
        {isSelected && (
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] px-2 py-1 rounded-bl">Div</div>
        )}
        {isSelected && (
            <div className="absolute -right-3 -top-3 flex flex-col gap-1 z-20">
                <button onClick={handleDuplicate} className="bg-white border border-border text-textSecondary p-1 rounded-full shadow-sm hover:bg-slate-50">
                    <Copy size={12} />
                </button>
                <button onClick={handleMoveUp} className="bg-white border border-border text-textSecondary p-1 rounded-full shadow-sm hover:bg-slate-50">
                    <ChevronUp size={12} />
                </button>
                <button onClick={handleMoveDown} className="bg-white border border-border text-textSecondary p-1 rounded-full shadow-sm hover:bg-slate-50">
                    <ChevronDown size={12} />
                </button>
                <button onClick={handleDelete} className="bg-red-500 text-white p-1 rounded-full shadow-sm">
                <X size={12} />
                </button>
            </div>
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
                           onDuplicate={onDuplicate}
                           onMoveUp={onMoveUp}
                           onMoveDown={onMoveDown}
                           previewMode={previewMode}
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
  const html = renderBlockContent(block, globalStyle, assets, undefined, block.id);

  return (
    <div 
      key={block.id}
      onClick={(e) => { e.stopPropagation(); setActiveBlockId(block.id); }}
      draggable
      onDragStart={handleDragStart}
      className={`relative group cursor-pointer border-2 transition-all ${isSelected ? 'border-primary' : 'border-transparent hover:border-primary/30'}`}
      style={{ margin: effectiveMargin }}
    >
       {isSelected && (
          <div className="absolute -right-8 top-0 flex flex-col gap-1 z-10">
             <button onClick={handleDuplicate} className="p-1 bg-white border border-border rounded shadow hover:bg-slate-50 text-textSecondary"><Copy size={14}/></button>
             <button onClick={handleMoveUp} className="p-1 bg-white border border-border rounded shadow hover:bg-slate-50 text-textSecondary"><ChevronUp size={14}/></button>
             <button onClick={handleMoveDown} className="p-1 bg-white border border-border rounded shadow hover:bg-slate-50 text-textSecondary"><ChevronDown size={14}/></button>
             <button onClick={handleDelete} className="p-1 bg-white border border-border rounded shadow hover:bg-red-50 text-danger"><Trash2 size={14}/></button>
          </div>
       )}
       <div dangerouslySetInnerHTML={{ __html: html }} className="pointer-events-none" />
    </div>
  );
};

export default BlockRenderer;
