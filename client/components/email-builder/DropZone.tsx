
import React, { useState } from 'react';

interface DropZoneProps {
  parentId: string | null;
  index: number;
  onDrop: (parentId: string | null, index: number, payload: any) => void;
  className?: string;
}

const DropZone: React.FC<DropZoneProps> = ({ parentId, index, onDrop, className }) => {
  const [isActive, setIsActive] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsActive(true);
  };

  const handleDragLeave = () => {
    setIsActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    setIsActive(false);
    
    const dragType = e.dataTransfer.getData('dragType');
    const blockType = e.dataTransfer.getData('blockType');
    const blockId = e.dataTransfer.getData('blockId');

    if (dragType === 'move' && blockId) {
      onDrop(parentId, index, { type: 'move', id: blockId });
    } else if (blockType) {
      onDrop(parentId, index, { type: 'add', blockType });
    }
  };

  return (
    <div 
      className={`transition-all duration-200 ${isActive ? 'py-4 opacity-100' : 'py-1 opacity-0 hover:opacity-100'} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`h-1 rounded-full w-full transition-colors duration-200 ${isActive ? 'bg-primary shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-primary/30'}`} />
    </div>
  );
};

export default DropZone;
