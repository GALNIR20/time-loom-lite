import { useRef, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDateDisplay } from '@/lib/timeline';
import { getPhaseColor } from '@/hooks/useMilestoneSettings';

interface GanttBarProps {
  milestoneId: string;
  milestoneName: string;
  phaseName: string;
  durationDays: number;
  startDate: string;
  endDate: string;
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

// Color map for gantt bar backgrounds based on phase color
const GANTT_PHASE_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  cyan: 'bg-cyan-500',
  pink: 'bg-pink-500',
  yellow: 'bg-yellow-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
};

const getMilestoneColor = (milestoneId: string, phaseName?: string) => {
  const baseId = milestoneId.replace(/-\d+$/, '');
  // Keep known milestone-specific colors for backward compatibility
  switch (baseId) {
    case 'brief':
      return 'bg-milestone-brief';
    case 'pre-concept':
      return 'bg-milestone-pre-concept';
    case 'concept':
      return 'bg-milestone-concept';
    case 'art-sketch':
      return 'bg-milestone-art-sketch';
    case 'sketch':
      return 'bg-milestone-sketch';
    case 'i-phase':
      return 'bg-milestone-i-phase';
    case 'sprint':
      return 'bg-success';
    default:
      // For dynamically added milestones, use phase color
      if (phaseName) {
        const color = getPhaseColor(phaseName);
        return GANTT_PHASE_COLORS[color] || 'bg-blue-500';
      }
      return 'bg-muted';
  }
};

export function GanttBar({
  milestoneId,
  milestoneName,
  phaseName,
  durationDays,
  startDate,
  endDate,
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

  const barContent = (
    <div
      ref={containerRef}
      className={`absolute top-1 bottom-1 rounded ${getMilestoneColor(milestoneId, phaseName)} flex items-center transition-all shadow-sm ${
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

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {barContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{milestoneName}</p>
            <p className="text-xs text-muted-foreground">{phaseName}</p>
            <div className="flex gap-4 text-xs pt-1 border-t border-border mt-1">
              <div>
                <span className="text-muted-foreground">Start: </span>
                <span className="font-medium">{formatDateDisplay(startDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">End: </span>
                <span className="font-medium">{formatDateDisplay(endDate)}</span>
              </div>
            </div>
            <p className="text-xs">
              <span className="text-muted-foreground">Duration: </span>
              <span className="font-medium">{durationDays} days</span>
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
