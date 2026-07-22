import { useState } from 'react';
import { GripVertical, X, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { EmptyJobsIllustration } from '@/components/illustrations/EmptyJobsIllustration';

export function BatchFileQueue({ files, onReorder, onRemove, onClear }) {
  const [dragIndex, setDragIndex] = useState(null);

  const handleDragStart = (index) => setDragIndex(index);

  const handleDragOver = (event, index) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onReorder(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  if (!files.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed bg-muted/30">
        <EmptyJobsIllustration className="w-24 h-24 mb-3" />
        <p className="text-sm font-medium">Queue is empty</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Upload images above to build your batch. Drag to reorder before processing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{files.length} file(s) — drag to reorder</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear all
        </Button>
      </div>
      <ul className="space-y-1 rounded-lg border divide-y">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-2 bg-background cursor-grab active:cursor-grabbing ${
              dragIndex === index ? 'opacity-60 ring-2 ring-primary/30' : ''
            }`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">{file.name}</span>
            <span className="text-xs text-muted-foreground">#{index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
