
import React, { useState, useEffect, useRef } from 'react';
import { useCampaignStore } from '../stores/campaignStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore'; // Import Settings
import { useNotificationStore } from '../stores/notificationStore';
import { 
  FileText, Plus, Save, Eye, X, Monitor, Smartphone, Image as ImageIcon, Layers, Copy, ChevronUp, ChevronDown, Trash2
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
  backgroundGradient: undefined,
  contentWidth: 600,
  contentFullWidth: true,
  contentBackgroundColor: '#FFFFFF',
  contentBackgroundGradient: undefined,
  contentBackgroundImage: undefined,
  fontFamily: 'Arial, Helvetica, sans-serif'
};

const DEFAULT_BLOCKS_DATA: Record<string, any> = {
  text: { text: '<h2 style="margin:0">New Text Block</h2><p>Edit this text...</p>' },
  image: { url: 'https://via.placeholder.com/600x300', width: '100%', alt: 'Image' },
  button: { text: 'Click Me', url: '#' },
  spacer: { height: 20 },
  divider: {},
  list: { items: ['First item', 'Second item', 'Third item'], ordered: false },
  badge: { badgeText: 'NEW' },
  header: { title: 'MATLANCE', subtitle: 'Business Formation & Compliance', logoUrl: '{{company_logo}}' },
  footer: { footerText: '&copy; {{company_name}} • {{company_address}} • {{unsubscribe_link}}' },
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

const getLayerLabel = (block: EditorBlock): string => {
  if (block.type === 'text') {
    const raw = (block.content.text || '').replace(/<[^>]*>/g, '').trim();
    return raw ? `Text: ${raw.slice(0, 24)}` : 'Text';
  }
  if (block.type === 'image') return 'Image';
  if (block.type === 'button') return `Button: ${block.content.text || ''}`;
  if (block.type === 'divider') return 'Divider';
  if (block.type === 'spacer') return 'Spacer';
  if (block.type === 'social') return 'Social';
  if (block.type === 'html') return 'HTML';
  if (block.type === 'badge') return `Badge: ${block.content.badgeText || ''}`;
  if (block.type === 'list') return 'List';
  if (block.type === 'header') return `Header: ${block.content.title || ''}`;
  if (block.type === 'footer') return 'Footer';
  if (block.type === 'columns') return 'Columns';
  if (block.type === 'div') return 'Container';
  return block.type;
};

const LayerItem: React.FC<{
  block: EditorBlock;
  depth: number;
  activeBlockId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ block, depth, activeBlockId, onSelect, onDuplicate, onMoveUp, onMoveDown, onDelete }) => {
  const isActive = activeBlockId === block.id;
  const label = getLayerLabel(block);

  const renderChildren = () => {
    if (block.type === 'columns' && block.content.columns) {
      return block.content.columns.map((col, idx) => (
        <div key={`${block.id}-col-${idx}`} className="pl-3 border-l border-border/60 ml-2">
          <div className="text-[10px] text-textMuted uppercase mb-1">Column {idx + 1}</div>
          {col.map(child => (
            <LayerItem
              key={child.id}
              block={child}
              depth={depth + 1}
              activeBlockId={activeBlockId}
              onSelect={onSelect}
              onDuplicate={onDuplicate}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDelete={onDelete}
            />
          ))}
        </div>
      ));
    }
    if (block.type === 'div' && block.content.children) {
      return (
        <div className="pl-3 border-l border-border/60 ml-2">
          {block.content.children.map(child => (
            <LayerItem
              key={child.id}
              block={child}
              depth={depth + 1}
              activeBlockId={activeBlockId}
              onSelect={onSelect}
              onDuplicate={onDuplicate}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDelete={onDelete}
            />
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${isActive ? 'bg-softMint border-primary' : 'bg-white border-border hover:bg-slate-50'}`}
        style={{ marginLeft: depth * 6 }}
      >
        <button onClick={() => onSelect(block.id)} className="text-left text-xs font-semibold text-textPrimary truncate flex-1">
          {label}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => onMoveUp(block.id)} className="p-1 text-textMuted hover:text-primary">
            <ChevronUp size={12} />
          </button>
          <button onClick={() => onMoveDown(block.id)} className="p-1 text-textMuted hover:text-primary">
            <ChevronDown size={12} />
          </button>
          <button onClick={() => onDuplicate(block.id)} className="p-1 text-textMuted hover:text-primary">
            <Copy size={12} />
          </button>
          <button onClick={() => onDelete(block.id)} className="p-1 text-textMuted hover:text-danger">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {renderChildren()}
    </div>
  );
};

const EmailTemplates: React.FC = () => {
  const { templates, addTemplate, updateTemplate, removeTemplate } = useCampaignStore();
  const { user } = useAuthStore();
  const { generalSettings } = useSettingsStore(); // Get settings for logo
  const { addNotification } = useNotificationStore();
  
  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [globalStyle, setGlobalStyle] = useState<GlobalStyle>(DEFAULT_GLOBAL_STYLE);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedBlocks, setSavedBlocks] = useState<EditorBlock[]>([]);
  
  const [metadata, setMetadata] = useState({ name: '', subject: '' });
  const [templatePurpose, setTemplatePurpose] = useState('Custom');
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [rawHtml, setRawHtml] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'blocks' | 'layers' | 'properties'>('blocks');
  const [leftPanelWidth, setLeftPanelWidth] = useState(260);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const TEMPLATE_PURPOSES: { label: string; name: string; defaultSubject: string }[] = [
    { label: 'Custom', name: '', defaultSubject: '' },
    { label: 'Meeting Scheduled', name: 'Meeting Scheduled', defaultSubject: 'Meeting Scheduled: {{meeting_title}}' },
    { label: 'Meeting Updated', name: 'Meeting Updated', defaultSubject: 'Updated: {{meeting_title}}' },
    { label: 'Meeting Cancelled', name: 'Meeting Cancelled', defaultSubject: 'Cancelled: {{meeting_title}}' },
    { label: 'Invoice Alert', name: 'Invoice Alert', defaultSubject: 'Invoice {{invoice_id}} from {{company_name}}' },
    { label: 'Invoice Reminder', name: 'Invoice Reminder', defaultSubject: 'Reminder: Invoice {{invoice_id}} is due' }
  ];

  // Load Template
  useEffect(() => {
    if (selectedId) {
      const template = templates.find(t => t.id === selectedId);
      if (template) {
        setMetadata({ name: template.name, subject: template.subject });
        const purpose = TEMPLATE_PURPOSES.find(p => p.name === template.name);
        setTemplatePurpose(purpose ? purpose.label : 'Custom');
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
      setTemplatePurpose('Custom');
      setBlocks([]);
      setActiveBlockId(null);
      setGlobalStyle(DEFAULT_GLOBAL_STYLE);
      setEditorMode('visual');
      setRightPanelTab('blocks');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]); 

  // Load Saved Blocks
  useEffect(() => {
    try {
      const raw = localStorage.getItem('email_builder_saved_blocks');
      if (raw) setSavedBlocks(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load saved blocks', e);
    }
  }, []);

  const persistSavedBlocks = (next: EditorBlock[]) => {
    setSavedBlocks(next);
    try {
      localStorage.setItem('email_builder_saved_blocks', JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save blocks', e);
    }
  };

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

  useEffect(() => {
    if (activeBlockId) {
      setRightPanelTab('properties');
    } else if (rightPanelTab === 'properties') {
      setRightPanelTab('blocks');
    }
  }, [activeBlockId, rightPanelTab]);

  useEffect(() => {
    if (!isResizingLeft) return;
    const handleMove = (e: MouseEvent) => {
      if (!leftPanelRef.current) return;
      const rect = leftPanelRef.current.getBoundingClientRect();
      const nextWidth = Math.max(200, Math.min(420, e.clientX - rect.left));
      setLeftPanelWidth(nextWidth);
    };
    const handleUp = () => setIsResizingLeft(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingLeft]);

  useEffect(() => {
    if (!isResizingRight) return;
    const handleMove = (e: MouseEvent) => {
      if (!rightPanelRef.current) return;
      const rect = rightPanelRef.current.getBoundingClientRect();
      const nextWidth = Math.max(280, Math.min(520, rect.right - e.clientX));
      setRightPanelWidth(nextWidth);
    };
    const handleUp = () => setIsResizingRight(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingRight]);

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
        padding: '0',
        backgroundColor: (type === 'columns' || type === 'div') ? 'transparent' : undefined,
        textAlign: 'left',
        color: '#333333',
        fontSize: 16
      }
    };
    
    // Initialize columns as empty arrays
    if (type === 'columns' && newBlock.content.columns) {
        newBlock.content.columns = newBlock.content.columns.map(() => []);
    }
    return newBlock;
  };

  const cloneBlock = (block: EditorBlock): EditorBlock => {
    const newId = Math.random().toString(36).substr(2, 9);
    if (block.type === 'columns' && block.content.columns) {
      return {
        ...block,
        id: newId,
        content: {
          ...block.content,
          columns: block.content.columns.map(col => col.map(child => cloneBlock(child)))
        }
      };
    }
    if (block.type === 'div' && block.content.children) {
      return {
        ...block,
        id: newId,
        content: {
          ...block.content,
          children: block.content.children.map(child => cloneBlock(child))
        }
      };
    }
    return { ...block, id: newId, content: { ...block.content } };
  };

  const duplicateBlock = (id: string) => {
    let newActiveId: string | null = null;
    const duplicateRecursive = (list: EditorBlock[]): EditorBlock[] => {
      const next: EditorBlock[] = [];
      list.forEach(b => {
        if (b.id === id) {
          const cloned = cloneBlock(b);
          newActiveId = cloned.id;
          next.push(b, cloned);
          return;
        }
        let updated = b;
        if (b.type === 'columns' && b.content.columns) {
          updated = { ...b, content: { ...b.content, columns: b.content.columns.map(col => duplicateRecursive(col)) } };
        }
        if (b.type === 'div' && b.content.children) {
          updated = { ...b, content: { ...b.content, children: duplicateRecursive(b.content.children) } };
        }
        next.push(updated);
      });
      return next;
    };
    setBlocks(duplicateRecursive(blocks));
    if (newActiveId) setActiveBlockId(newActiveId);
  };

  const saveActiveBlockToLibrary = () => {
    if (!activeBlock) return;
    const cloned = cloneBlock(activeBlock);
    persistSavedBlocks([...savedBlocks, cloned]);
  };

  const insertSavedBlock = (block: EditorBlock) => {
    const cloned = cloneBlock(block);
    setBlocks([...blocks, cloned]);
    setActiveBlockId(cloned.id);
  };

  const removeSavedBlock = (id: string) => {
    persistSavedBlocks(savedBlocks.filter(b => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const moveRecursive = (list: EditorBlock[]): EditorBlock[] => {
      const idx = list.findIndex(b => b.id === id);
      if (idx !== -1) {
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= list.length) return list;
        const newList = [...list];
        const [item] = newList.splice(idx, 1);
        newList.splice(newIdx, 0, item);
        return newList;
      }
      return list.map(b => {
        if (b.type === 'columns' && b.content.columns) {
          return { ...b, content: { ...b.content, columns: b.content.columns.map(col => moveRecursive(col)) } };
        }
        if (b.type === 'div' && b.content.children) {
          return { ...b, content: { ...b.content, children: moveRecursive(b.content.children) } };
        }
        return b;
      });
    };
    setBlocks(moveRecursive(blocks));
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
      if (!metadata.name) {
        setSaveError('Template name is required.');
        return;
      }
      setSaveError(null);
      
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
      setIsSaving(true);
      try {
        if (selectedId && existing && isMongoId(selectedId)) {
            await updateTemplate(selectedId, templateData);
        } else {
            const created = await addTemplate(templateData);
            setSelectedId(created.id);
        }
        addNotification('success', 'Template saved.');
      } finally {
        setIsSaving(false);
      }
  };

  const handleDeleteTemplate = (id: string) => {
    setDeleteTemplateId(id);
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    const template = templates.find(t => t.id === deleteTemplateId);
    await removeTemplate(deleteTemplateId);
    if (selectedId === deleteTemplateId) {
      setSelectedId(null);
      setBlocks([]);
      setActiveBlockId(null);
      setGlobalStyle(DEFAULT_GLOBAL_STYLE);
      setEditorMode('visual');
    }
    setDeleteTemplateId(null);
    addNotification('success', `Template ${template?.name ? `"${template.name}" ` : ''}deleted.`);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -m-8 bg-appBg">
      {/* 1. Sidebar List */}
      <div
        ref={leftPanelRef}
        className="bg-white border-r border-border flex flex-col z-10 shrink-0 relative"
        style={{ width: leftPanelWidth }}
      >
        <div
          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/20"
          onMouseDown={() => setIsResizingLeft(true)}
          title="Drag to resize"
        />
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-3"><FileText size={18} className="text-primary"/> Templates</h2>
          <button onClick={() => setSelectedId(null)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-darkGreen text-white font-bold rounded-lg shadow-sm hover:opacity-90 text-sm"><Plus size={16} /> New Template</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {templates.map(t => (
            <div key={t.id} className={`w-full px-3 py-2 rounded-lg transition-all border ${selectedId === t.id ? 'bg-softMint border-primary text-darkGreen' : 'bg-white border-transparent hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setSelectedId(t.id)} className="flex-1 text-left">
                  <p className="font-bold text-sm truncate">{t.name}</p>
                  {isSaving && selectedId === t.id && (
                    <p className="text-[10px] text-textMuted mt-0.5">Saving...</p>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="p-1 text-textMuted hover:text-danger"
                  title="Delete template"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
         <div className="h-16 bg-white border-b border-border flex justify-between items-center px-6 shadow-sm z-20">
             <div className="flex flex-col">
                 <div className="flex items-center gap-3">
                   <select
                     value={templatePurpose}
                     onChange={(e) => {
                       const selected = e.target.value;
                       setTemplatePurpose(selected);
                       const preset = TEMPLATE_PURPOSES.find(p => p.label === selected);
                       if (preset && preset.name) {
                         setMetadata(prev => ({
                           name: preset.name,
                           subject: prev.subject ? prev.subject : preset.defaultSubject
                         }));
                       } else {
                         setMetadata(prev => ({ ...prev, name: prev.name || '' }));
                       }
                     }}
                     className="text-xs border border-border rounded px-2 py-1 bg-white text-textSecondary"
                   >
                     {TEMPLATE_PURPOSES.map(p => (
                       <option key={p.label} value={p.label}>{p.label}</option>
                     ))}
                   </select>
                   <input type="text" value={metadata.name} onChange={(e) => { setMetadata({...metadata, name: e.target.value}); setTemplatePurpose('Custom'); setSaveError(null); }} placeholder="Template Name" className="text-sm font-bold bg-transparent outline-none" />
                 </div>
                 <input type="text" value={metadata.subject} onChange={(e) => { setMetadata({...metadata, subject: e.target.value}); setSaveError(null); }} placeholder="Subject Line" className="text-xs text-textSecondary bg-transparent outline-none" />
             </div>
             <div className="flex items-center gap-3">
                 <button onClick={() => setIsAssetManagerOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-border text-textSecondary font-semibold rounded-lg text-xs hover:bg-slate-200"><ImageIcon size={14}/> Assets</button>
                 <div className="flex bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded ${previewMode==='desktop'?'bg-white shadow text-darkGreen':'text-textMuted'}`}><Monitor size={16}/></button>
                    <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded ${previewMode==='mobile'?'bg-white shadow text-darkGreen':'text-textMuted'}`}><Smartphone size={16}/></button>
                 </div>
                 {selectedId && (
                   <button
                     onClick={() => handleDeleteTemplate(selectedId)}
                     className="flex items-center gap-2 px-4 py-2 border border-border text-danger font-semibold rounded-lg text-sm hover:bg-red-50"
                   >
                     <Trash2 size={16}/> Delete Template
                   </button>
                 )}
                 {activeBlock && (
                   <button onClick={saveActiveBlockToLibrary} className="flex items-center gap-2 px-4 py-2 border border-border text-textSecondary font-semibold rounded-lg text-sm">
                     <Copy size={16}/> Save Block
                   </button>
                 )}
                 {saveError && (
                   <span className="text-xs text-danger font-bold">{saveError}</span>
                 )}
                 <button onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-border text-textSecondary font-semibold rounded-lg text-sm"><Eye size={16}/> Preview</button>
                 <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-primary text-darkGreen font-bold rounded-lg shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                   <Save size={16}/> {isSaving ? 'Saving...' : 'Save'}
                 </button>
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
                duplicateBlock={duplicateBlock}
                moveBlockUp={(id) => moveBlock(id, 'up')}
                moveBlockDown={(id) => moveBlock(id, 'down')}
                previewMode={previewMode}
                onDrop={handleDrop}
             />
         ) : (
             <textarea value={rawHtml} onChange={(e) => setRawHtml(e.target.value)} className="flex-1 bg-[#1e1e1e] text-white p-6 font-mono text-sm resize-none outline-none" />
         )}
      </div>

      {/* 3. Right Sidebar */}
      <div
        ref={rightPanelRef}
        className="bg-white border-l border-border flex flex-col shrink-0 z-10 relative"
        style={{ width: rightPanelWidth }}
      >
         <div
           className="absolute top-0 left-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/20"
           onMouseDown={() => setIsResizingRight(true)}
           title="Drag to resize"
         />
         <div className="flex border-b border-border">
            <button
              className={`flex-1 py-3 text-sm font-bold border-b-2 ${rightPanelTab==='blocks'?'border-primary text-darkGreen':'border-transparent text-textSecondary'}`}
              onClick={() => { setActiveBlockId(null); setRightPanelTab('blocks'); }}
            >
              Blocks
            </button>
            <button
              className={`flex-1 py-3 text-sm font-bold border-b-2 ${rightPanelTab==='layers'?'border-primary text-darkGreen':'border-transparent text-textSecondary'}`}
              onClick={() => setRightPanelTab('layers')}
            >
              Layers
            </button>
            <button
              className={`flex-1 py-3 text-sm font-bold border-b-2 ${rightPanelTab==='properties'?'border-primary text-darkGreen':'border-transparent text-textSecondary'}`}
              onClick={() => activeBlockId && setRightPanelTab('properties')}
              disabled={!activeBlockId}
            >
              Properties
            </button>
         </div>
         <div className="flex-1 overflow-y-auto p-6">
            {rightPanelTab === 'properties' && activeBlockId && activeBlock ? (
                <PropertiesPanel 
                    block={activeBlock} 
                    onUpdateContent={handleUpdateBlockContent} 
                    onUpdateStyle={handleUpdateBlockStyle} 
                    onClose={() => setActiveBlockId(null)} 
                    onDuplicate={duplicateBlock}
                    onMoveUp={(id) => moveBlock(id, 'up')}
                    onMoveDown={(id) => moveBlock(id, 'down')}
                    onDelete={deleteBlock}
                />
            ) : rightPanelTab === 'layers' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-textSecondary">
                    <Layers size={14} /> Layer Tree
                  </div>
                  <div className="space-y-2">
                    {blocks.length === 0 && (
                      <div className="text-xs text-textMuted">No blocks yet.</div>
                    )}
                    {blocks.map((b) => (
                      <LayerItem
                        key={b.id}
                        block={b}
                        depth={0}
                        activeBlockId={activeBlockId}
                        onSelect={setActiveBlockId}
                        onDuplicate={duplicateBlock}
                        onMoveUp={(id) => moveBlock(id, 'up')}
                        onMoveDown={(id) => moveBlock(id, 'down')}
                        onDelete={deleteBlock}
                      />
                    ))}
                  </div>
                </div>
            ) : (
                <div className="space-y-6">
                  <Toolbox 
                      onAddBlock={handleAddBlock} 
                      globalStyle={globalStyle} 
                      setGlobalStyle={setGlobalStyle} 
                      onOpenAssetManager={() => setIsAssetManagerOpen(true)}
                  />
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-textSecondary uppercase">Saved Blocks</h4>
                      <button
                        onClick={saveActiveBlockToLibrary}
                        disabled={!activeBlock}
                        className="text-xs font-bold text-primary disabled:opacity-50"
                      >
                        Save Selected
                      </button>
                    </div>
                    {savedBlocks.length === 0 ? (
                      <div className="text-xs text-textMuted">No saved blocks.</div>
                    ) : (
                      <div className="space-y-2">
                        {savedBlocks.map(block => (
                          <div key={block.id} className="flex items-center justify-between gap-2 p-2 border border-border rounded-lg bg-white">
                            <span className="text-xs font-semibold text-textPrimary truncate">{getLayerLabel(block)}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => insertSavedBlock(block)} className="px-2 py-1 text-xs font-bold text-darkGreen bg-softMint rounded">
                                Insert
                              </button>
                              <button onClick={() => removeSavedBlock(block.id)} className="px-2 py-1 text-xs font-bold text-danger bg-red-50 rounded">
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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

      {deleteTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-textPrimary mb-2">Delete template?</h3>
            <p className="text-sm text-textSecondary mb-6">
              This will permanently delete the template. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTemplateId(null)}
                className="flex-1 py-2 border border-border rounded-xl font-bold text-textSecondary hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTemplate}
                className="flex-1 py-2 bg-danger text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
