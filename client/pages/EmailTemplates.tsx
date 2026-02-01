
import React, { useState, useEffect, useRef } from 'react';
import { useCampaignStore } from '../stores/campaignStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore'; // Import Settings
import { 
  FileText, Plus, Save, Eye, X, Monitor, Smartphone, Image as ImageIcon
} from 'lucide-react';

// Import Separated Components
import Toolbox from '../components/email-builder/Toolbox';
import PropertiesPanel from '../components/email-builder/PropertiesPanel';
import AssetManager from '../components/email-builder/AssetManager';
import Canvas from '../components/email-builder/Canvas';
import { compileHtml } from '../components/email-builder/compiler';
import { EditorBlock, BlockType, GlobalStyle, Asset } from '../components/email-builder/types';

// Default Data
const DEFAULT_GLOBAL_STYLE: GlobalStyle = {
  backgroundColor: '#F1F5F9',
  contentWidth: 600,
  contentBackgroundColor: '#FFFFFF',
  fontFamily: 'Arial, Helvetica, sans-serif'
};

const DEFAULT_BLOCKS_DATA: Record<string, any> = {
  text: { text: '<h2 style="margin:0">New Text Block</h2><p>Edit this text...</p>' },
  image: { url: 'https://via.placeholder.com/600x300', width: '100%', alt: 'Image' },
  button: { text: 'Click Me', url: '#' },
  spacer: { height: 20 },
  divider: {},
  social: { 
    iconStyle: 'circle',
    socialLinks: [
      { id: '1', network: 'facebook', url: 'https://facebook.com' },
      { id: '2', network: 'instagram', url: 'https://instagram.com' },
      { id: '3', network: 'twitter', url: 'https://twitter.com' }
    ]
  },
  html: { html: '<div style="border: 1px dashed #ccc; padding: 10px; text-align: center;">Custom HTML</div>' },
  div: { children: [], height: 'auto', width: '100%' }
};

const EmailTemplates: React.FC = () => {
  const { templates, addTemplate, updateTemplate } = useCampaignStore();
  const { user } = useAuthStore();
  const { generalSettings } = useSettingsStore(); // Get settings for logo
  
  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [globalStyle, setGlobalStyle] = useState<GlobalStyle>(DEFAULT_GLOBAL_STYLE);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [metadata, setMetadata] = useState({ name: '', subject: '' });
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [rawHtml, setRawHtml] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);

  // Load Template
  useEffect(() => {
    if (selectedId) {
      const template = templates.find(t => t.id === selectedId);
      if (template) {
        setMetadata({ name: template.name, subject: template.subject });
        if (template.designJson) {
          try {
            const parsed = JSON.parse(template.designJson);
            // Migrate container -> div if old save exists
            const migrate = (blks: any[]): any[] => blks.map(b => ({
                ...b,
                type: b.type === 'container' ? 'div' : b.type,
                content: {
                    ...b.content,
                    children: b.content.children ? migrate(b.content.children) : undefined,
                    columns: b.content.columns ? b.content.columns.map((col: any) => migrate(col)) : undefined
                }
            }));
            setBlocks(migrate(parsed.blocks || []));
            setGlobalStyle(parsed.globalStyle || DEFAULT_GLOBAL_STYLE);
            setEditorMode('visual');
          } catch (e) {
            console.error(e);
          }
        } else {
          setRawHtml(template.htmlContent);
          setEditorMode('code');
          setBlocks([]);
        }
      }
    } else {
      setMetadata({ name: '', subject: '' });
      setBlocks([]);
      setActiveBlockId(null);
      setGlobalStyle(DEFAULT_GLOBAL_STYLE);
      setEditorMode('visual');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]); 

  // --- Block Helper ---
  const findBlock = (id: string, list: EditorBlock[]): EditorBlock | undefined => {
    for (const b of list) {
      if (b.id === id) return b;
      if (b.type === 'columns' && b.content.columns) {
        for (const col of b.content.columns) {
          const found = findBlock(id, col);
          if (found) return found;
        }
      }
      if (b.type === 'div' && b.content.children) {
          const found = findBlock(id, b.content.children);
          if (found) return found;
      }
    }
    return undefined;
  };

  const activeBlock = activeBlockId ? findBlock(activeBlockId, blocks) : undefined;

  // --- Recursive Find Parent ID of a Block ---
  const findBlockParentId = (list: EditorBlock[], targetId: string, currentParentId: string | null = null): string | null | undefined => {
    for (const b of list) {
        if (b.id === targetId) return currentParentId;
        
        if (b.type === 'columns' && b.content.columns) {
            for (let i = 0; i < b.content.columns.length; i++) {
                const colId = `${b.id}_col_${i}`;
                const found = findBlockParentId(b.content.columns[i], targetId, colId);
                if (found !== undefined) return found;
            }
        }
        if (b.type === 'div' && b.content.children) {
            const found = findBlockParentId(b.content.children, targetId, b.id);
            if (found !== undefined) return found;
        }
    }
    return undefined;
  };

  // --- Helper to find the actual array containing the block (nested) ---
  const findBlockContainer = (list: EditorBlock[], parentId: string | null): EditorBlock[] | null => {
      if (parentId === null) return list;
      
      // Check for column specific parentId: blockId_col_index
      if (parentId.includes('_col_')) {
          const [blockId, colIdxStr] = parentId.split('_col_');
          const colIdx = parseInt(colIdxStr);
          const parentBlock = findBlock(blockId, list);
          if (parentBlock && parentBlock.type === 'columns' && parentBlock.content.columns) {
              return parentBlock.content.columns[colIdx];
          }
          return null;
      }

      const parentBlock = findBlock(parentId, list);
      if (parentBlock && parentBlock.type === 'div' && parentBlock.content.children) {
          return parentBlock.content.children;
      }
      return null;
  }

  // --- CREATE BLOCK HELPER ---
  const createBlock = (type: BlockType, layout?: number[]): EditorBlock => {
    const newBlock: EditorBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'columns' ? { layout, columns: layout?.map(() => []) } : { ...DEFAULT_BLOCKS_DATA[type] },
      style: { 
        padding: '10px 20px', 
        backgroundColor: (type === 'columns' || type === 'div') ? 'transparent' : undefined,
        textAlign: 'center',
        color: '#333333',
        fontSize: 16,
        borderRadius: 4
      }
    };
    
    // Initialize columns as empty arrays
    if (type === 'columns' && newBlock.content.columns) {
        newBlock.content.columns = newBlock.content.columns.map(() => []);
    }
    return newBlock;
  };

  // --- ACTIONS ---

  const handleAddBlock = (type: BlockType, layout?: number[]) => {
    const newBlock = createBlock(type, layout);
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  // NEW: Handle Drag and Drop (Add & Move)
  const handleDrop = (parentId: string | null, index: number, payload: { type: 'add' | 'move', blockType?: string, id?: string }) => {
      
      // CASE 1: ADD NEW BLOCK
      if (payload.type === 'add' && payload.blockType) {
          const newBlock = createBlock(payload.blockType as BlockType);
          insertBlockIntoTree(newBlock, parentId, index);
          setActiveBlockId(newBlock.id);
      }
      // CASE 2: MOVE EXISTING BLOCK
      else if (payload.type === 'move' && payload.id) {
          const blockId = payload.id;
          
          if (parentId && (parentId === blockId || parentId.startsWith(blockId + '_col_'))) return;
          const movingBlock = findBlock(blockId, blocks);
          if (movingBlock && parentId && parentId !== 'root') {
          }

          // 1. Find Source Info
          const sourceParentId = findBlockParentId(blocks, blockId);

          // 2. Identify if moving within same container
          const isSameContainer = sourceParentId === parentId;

          // 3. Remove Block from old location
          let blockToMove: EditorBlock | null = null;
          
          const deleteRecursive = (list: EditorBlock[]): EditorBlock[] => {
            return list.reduce((acc: EditorBlock[], b) => {
                 if (b.id === blockId) {
                     blockToMove = b;
                     return acc; // Remove it
                 }
                 // Recurse
                 const newB = { ...b };
                 if (newB.type === 'columns' && newB.content.columns) {
                     newB.content.columns = newB.content.columns.map(col => deleteRecursive(col));
                 }
                 if (newB.type === 'div' && newB.content.children) {
                     newB.content.children = deleteRecursive(newB.content.children);
                 }
                 acc.push(newB);
                 return acc;
            }, []);
          };

          const newBlocksAfterDelete = deleteRecursive(blocks);

          if (blockToMove) {
              // 4. Adjust Index if necessary
              let adjustedIndex = index;
              if (isSameContainer) {
                  const container = findBlockContainer(blocks, parentId); // Get ORIGINAL container
                  const sourceIndex = container ? container.findIndex(b => b.id === blockId) : -1;
                  if (sourceIndex !== -1 && sourceIndex < index) {
                      adjustedIndex = index - 1;
                  }
              }

              // 5. Insert at new location
              insertBlockIntoTree(blockToMove!, parentId, adjustedIndex, newBlocksAfterDelete);
              setActiveBlockId(blockId);
          }
      }
  };

  // Helper to insert into the state tree
  const insertBlockIntoTree = (block: EditorBlock, parentId: string | null, index: number, currentBlocks: EditorBlock[] = blocks) => {
      if (!parentId) {
          // Add to root
          const newBlocks = [...currentBlocks];
          newBlocks.splice(index, 0, block);
          setBlocks(newBlocks);
      } else {
          // Add to nested parent
          const updateRecursive = (list: EditorBlock[]): EditorBlock[] => {
              return list.map(b => {
                   // Handle Column Insertion
                   if (parentId.startsWith(b.id + '_col_')) {
                       const colIndex = parseInt(parentId.split('_col_')[1]);
                       if (b.content.columns && b.content.columns[colIndex]) {
                           const newCol = [...b.content.columns[colIndex]];
                           newCol.splice(index, 0, block);
                           const newColumns = [...b.content.columns];
                           newColumns[colIndex] = newCol;
                           return { ...b, content: { ...b.content, columns: newColumns } };
                       }
                   }

                   // Handle Div Insertion
                   if (b.id === parentId && b.type === 'div') {
                       const newChildren = [...(b.content.children || [])];
                       newChildren.splice(index, 0, block);
                       return { ...b, content: { ...b.content, children: newChildren } };
                   }

                   // Recursion
                   if (b.type === 'columns' && b.content.columns) {
                       return { ...b, content: { ...b.content, columns: b.content.columns.map(col => updateRecursive(col)) } };
                   }
                   if (b.type === 'div' && b.content.children) {
                       return { ...b, content: { ...b.content, children: updateRecursive(b.content.children) } };
                   }

                   return b;
              });
          };

          setBlocks(updateRecursive(currentBlocks));
      }
  };

  const handleUpdateBlockContent = (id: string, contentUpdates: any) => {
    const updateRecursive = (list: EditorBlock[]): EditorBlock[] => {
        return list.map(b => {
            if (b.id === id) return { ...b, content: { ...b.content, ...contentUpdates } };
            if (b.type === 'columns' && b.content.columns) {
                return { ...b, content: { ...b.content, columns: b.content.columns.map(col => updateRecursive(col)) } };
            }
             if (b.type === 'div' && b.content.children) {
                return { ...b, content: { ...b.content, children: updateRecursive(b.content.children) } };
            }
            return b;
        });
    };
    setBlocks(updateRecursive(blocks));
  };
  
  const handleUpdateBlockStyle = (id: string, styleUpdates: any) => {
      const updateRecursive = (list: EditorBlock[]): EditorBlock[] => {
        return list.map(b => {
            if (b.id === id) return { ...b, style: { ...b.style, ...styleUpdates } };
            if (b.type === 'columns' && b.content.columns) {
                return { ...b, content: { ...b.content, columns: b.content.columns.map(col => updateRecursive(col)) } };
            }
             if (b.type === 'div' && b.content.children) {
                return { ...b, content: { ...b.content, children: updateRecursive(b.content.children) } };
            }
            return b;
        });
    };
    setBlocks(updateRecursive(blocks));
  };

  const deleteBlock = (id: string) => {
      const deleteRecursive = (list: EditorBlock[]): EditorBlock[] => {
          return list.filter(b => b.id !== id).map(b => {
               if (b.type === 'columns' && b.content.columns) {
                   return { ...b, content: { ...b.content, columns: b.content.columns.map(col => deleteRecursive(col)) } };
               }
               if (b.type === 'div' && b.content.children) {
                   return { ...b, content: { ...b.content, children: deleteRecursive(b.content.children) } };
               }
               return b;
          });
      };
      setBlocks(deleteRecursive(blocks));
      if (activeBlockId === id) setActiveBlockId(null);
  };

  // --- Save ---
  const handleSave = async () => {
      if (!metadata.name) return alert("Please name your template");
      
      // Pass Logo URL to compileHtml
      const html = editorMode === 'visual' ? compileHtml(blocks, globalStyle, assets, generalSettings.logoUrl) : rawHtml;
      const designJson = editorMode === 'visual' ? JSON.stringify({ blocks, globalStyle }) : undefined;

      const templateData = {
          id: selectedId || 'temp-' + Math.random().toString(36).substr(2, 9),
          createdBy: user?.name || 'Unknown',
          ...metadata,
          htmlContent: html,
          designJson
      };

      const isMongoId = (value: string | null) => !!value && /^[a-f0-9]{24}$/i.test(value);
      const existing = selectedId ? templates.find(t => t.id === selectedId) : null;
      if (selectedId && existing && isMongoId(selectedId)) {
          await updateTemplate(selectedId, templateData);
      } else {
          const created = await addTemplate(templateData);
          setSelectedId(created.id);
      }
      alert("Saved!");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -m-8 bg-appBg">
      {/* 1. Sidebar List */}
      <div className="w-64 bg-white border-r border-border flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-3"><FileText size={18} className="text-primary"/> Templates</h2>
          <button onClick={() => setSelectedId(null)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-darkGreen text-white font-bold rounded-lg shadow-sm hover:opacity-90 text-sm"><Plus size={16} /> New Template</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {templates.map(t => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg transition-all border ${selectedId === t.id ? 'bg-softMint border-primary text-darkGreen' : 'bg-white border-transparent hover:bg-slate-50'}`}>
              <p className="font-bold text-sm truncate">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
         <div className="h-16 bg-white border-b border-border flex justify-between items-center px-6 shadow-sm z-20">
             <div className="flex flex-col">
                 <input type="text" value={metadata.name} onChange={(e) => setMetadata({...metadata, name: e.target.value})} placeholder="Template Name" className="text-sm font-bold bg-transparent outline-none" />
                 <input type="text" value={metadata.subject} onChange={(e) => setMetadata({...metadata, subject: e.target.value})} placeholder="Subject Line" className="text-xs text-textSecondary bg-transparent outline-none" />
             </div>
             <div className="flex items-center gap-3">
                 <button onClick={() => setIsAssetManagerOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-border text-textSecondary font-semibold rounded-lg text-xs hover:bg-slate-200"><ImageIcon size={14}/> Assets</button>
                 <div className="flex bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded ${previewMode==='desktop'?'bg-white shadow text-darkGreen':'text-textMuted'}`}><Monitor size={16}/></button>
                    <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded ${previewMode==='mobile'?'bg-white shadow text-darkGreen':'text-textMuted'}`}><Smartphone size={16}/></button>
                 </div>
                 <button onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-border text-textSecondary font-semibold rounded-lg text-sm"><Eye size={16}/> Preview</button>
                 <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-primary text-darkGreen font-bold rounded-lg shadow-sm text-sm"><Save size={16}/> Save</button>
             </div>
         </div>

         {editorMode === 'visual' ? (
             <Canvas 
                blocks={blocks}
                globalStyle={globalStyle}
                assets={assets}
                activeBlockId={activeBlockId}
                setActiveBlockId={setActiveBlockId}
                deleteBlock={deleteBlock}
                previewMode={previewMode}
                onDrop={handleDrop}
             />
         ) : (
             <textarea value={rawHtml} onChange={(e) => setRawHtml(e.target.value)} className="flex-1 bg-[#1e1e1e] text-white p-6 font-mono text-sm resize-none outline-none" />
         )}
      </div>

      {/* 3. Right Sidebar */}
      <div className="w-80 bg-white border-l border-border flex flex-col shrink-0 z-10">
         <div className="flex border-b border-border">
            <button className={`flex-1 py-3 text-sm font-bold border-b-2 ${!activeBlockId?'border-primary text-darkGreen':'border-transparent text-textSecondary'}`} onClick={() => setActiveBlockId(null)}>Blocks</button>
            <button className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeBlockId?'border-primary text-darkGreen':'border-transparent text-textSecondary'}`} disabled={!activeBlockId}>Properties</button>
         </div>
         <div className="flex-1 overflow-y-auto p-6">
            {activeBlockId && activeBlock ? (
                <PropertiesPanel 
                    block={activeBlock} 
                    onUpdateContent={handleUpdateBlockContent} 
                    onUpdateStyle={handleUpdateBlockStyle} 
                    onClose={() => setActiveBlockId(null)} 
                />
            ) : (
                <Toolbox 
                    onAddBlock={handleAddBlock} 
                    globalStyle={globalStyle} 
                    setGlobalStyle={setGlobalStyle} 
                    onOpenAssetManager={() => setIsAssetManagerOpen(true)}
                />
            )}
         </div>
      </div>

      {/* Asset Manager Modal */}
      <AssetManager 
        isOpen={isAssetManagerOpen} 
        onClose={() => setIsAssetManagerOpen(false)} 
        assets={assets} 
        setAssets={setAssets} 
      />

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-textPrimary">Preview</h3>
              <button onClick={() => setIsPreviewOpen(false)}><X size={24} /></button>
            </div>
            <div className="flex-1 bg-slate-200 p-8 flex justify-center overflow-y-auto">
               <iframe title="preview" srcDoc={editorMode === 'visual' ? compileHtml(blocks, globalStyle, assets, generalSettings.logoUrl) : rawHtml} style={{ width: previewMode === 'mobile' ? '375px' : '100%', height: '100%', border: 'none', background: 'white' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
