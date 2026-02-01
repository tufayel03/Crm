
import React, { useRef } from 'react';
import { 
  UploadCloud, FileText, Image as ImageIcon, Video, 
  Table, Trash2, Eye, Download, File
} from 'lucide-react';
import { ClientDocument } from '../../types';

interface FileSectionProps {
  title: string;
  icon: React.ReactNode;
  files: ClientDocument[];
  category: 'invoice' | 'contract';
  onUpload: (file: File, category: 'invoice' | 'contract') => void;
  onDelete: (id: string, category: 'invoice' | 'contract') => void;
  accept?: string;
}

const FileSection: React.FC<FileSectionProps> = ({ 
  title, icon, files, category, onUpload, onDelete, accept 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, category);
      // Reset input
      e.target.value = '';
    }
  };

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} className="text-purple-600" />;
    if (mimeType.startsWith('video/')) return <Video size={20} className="text-pink-600" />;
    if (mimeType === 'application/pdf') return <FileText size={20} className="text-red-600" />;
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || mimeType.includes('sheet') || mimeType.includes('csv')) {
        return <Table size={20} className="text-green-600" />;
    }
    return <File size={20} className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-border h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-textPrimary flex items-center gap-2">
          {icon} {title}
        </h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-textSecondary px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <UploadCloud size={14} /> Upload
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept={accept || "*"}
        />
      </div>

      {files.length === 0 ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center py-12 text-textMuted bg-slate-50 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-slate-100 transition-all cursor-pointer group"
        >
          <UploadCloud size={32} className="mb-2 group-hover:scale-110 transition-transform text-textSecondary" />
          <span className="text-sm font-medium">Click to upload documents</span>
          <span className="text-[10px]">PDF, Image, Video, Excel</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {files.map(file => (
            <div key={file.id} className="group flex items-center justify-between p-3 bg-appBg border border-border rounded-xl hover:border-primary/30 hover:bg-white hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center shrink-0">
                   {getFileIcon(file.type, file.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-textPrimary truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-textMuted flex items-center gap-2">
                    <span>{formatFileSize(file.size)}</span>
                    <span>-</span>
                    <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-2 text-textSecondary hover:bg-slate-100 hover:text-primary rounded-lg transition-colors"
                    title="View"
                >
                    <Eye size={16} />
                </a>
                <a 
                    href={file.url} 
                    download={file.name}
                    className="p-2 text-textSecondary hover:bg-slate-100 hover:text-darkGreen rounded-lg transition-colors"
                    title="Download"
                >
                    <Download size={16} />
                </a>
                <button 
                    onClick={() => onDelete(file.id, category)}
                    className="p-2 text-textSecondary hover:bg-red-50 hover:text-danger rounded-lg transition-colors"
                    title="Delete"
                >
                    <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileSection;

