import { useRef, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface GanttBarProps {
  milestoneId: string;
  phaseName: string;
  durationDays: number;
  offsetPercent: number;
  widthPercent: number;
  editMode: boolean;
  isDragging: boolean;
  onDragStart: (
    e: React.MouseEvent | React.TouchEvent,
    milestoneId: string,
    currentDays: number,
    containerWidth: number
  ) => void;
}

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case 'Concept Phase':
      return 'bg-primary';
    case 'Sketch Phase':
      return 'bg-warning';
    case 'Execution Phase':
      return 'bg-success';
    default:
      return 'bg-muted';
  }
};

export function GanttBar({
  milestoneId,
  phaseName,
  durationDays,
  offsetPercent,
  widthPercent,
  editMode,
  isDragging,
  onDragStart,
}: GanttBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.parentElement?.clientWidth || 0;
      onDragStart(e, milestoneId, durationDays, containerWidth);
    },
    [milestoneId, durationDays, onDragStart]
  );

  if (durationDays <= 0) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute top-1 bottom-1 rounded ${getPhaseColor(phaseName)} flex items-center transition-all shadow-sm ${
        isDragging ? 'ring-2 ring-ring ring-offset-1 z-20' : ''
      } ${editMode ? 'cursor-ew-resize' : ''}`}
      style={{
        left: `${offsetPercent}%`,
        width: `${Math.max(widthPercent, 1)}%`,
        minWidth: editMode ? '24px' : undefined,
      }}
    >
      <span className="text-[10px] font-medium text-white px-2 truncate flex-1">
        {widthPercent > 8 ? `${durationDays}d` : ''}
      </span>
      
      {/* Resize handle - only visible in edit mode */}
      {editMode && (
        <div
          className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center hover:bg-white/20 rounded-r transition-colors"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <GripVertical className="w-3 h-3 text-white/70" />
        </div>
      )}
    </div>
  );
}
