import { MilestoneState } from '@/types/timeline';
import { formatDateDisplay } from '@/lib/timeline';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { parseISO, differenceInDays } from 'date-fns';

interface TimelineViewProps {
  milestones: MilestoneState[];
  isOpen: boolean;
  onClose: () => void;
}

export function TimelineView({ milestones, isOpen, onClose }: TimelineViewProps) {
  const { totalDays, startDate } = useMemo(() => {
    if (milestones.length === 0) return { totalDays: 0, startDate: new Date() };
    
    const start = parseISO(milestones[0].start);
    const end = parseISO(milestones[milestones.length - 1].end);
    return {
      totalDays: differenceInDays(end, start),
      startDate: start,
    };
  }, [milestones]);

  if (!isOpen) return null;

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

  const getPhaseColorLight = (phase: string) => {
    switch (phase) {
      case 'Concept Phase':
        return 'bg-primary/20';
      case 'Sketch Phase':
        return 'bg-warning/20';
      case 'Execution Phase':
        return 'bg-success/20';
      default:
        return 'bg-muted/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Timeline View</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Close timeline view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-xs text-muted-foreground">Concept Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-warning" />
            <span className="text-xs text-muted-foreground">Sketch Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success" />
            <span className="text-xs text-muted-foreground">Execution Phase</span>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="min-w-[600px]">
            {/* Timeline bars */}
            <div className="space-y-2">
              {milestones.map((milestone, index) => {
                const milestoneStart = parseISO(milestone.start);
                const offsetDays = differenceInDays(milestoneStart, startDate);
                const offsetPercent = totalDays > 0 ? (offsetDays / totalDays) * 100 : 0;
                const widthPercent = totalDays > 0 ? (milestone.durationDays / totalDays) * 100 : 0;

                return (
                  <div key={milestone.id} className="flex items-center gap-3">
                    {/* Milestone name */}
                    <div className="w-28 flex-shrink-0 text-right">
                      <span className="text-sm font-medium text-foreground truncate block">
                        {milestone.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {milestone.durationDays}d
                      </span>
                    </div>

                    {/* Bar container */}
                    <div className="flex-1 h-10 bg-muted/30 rounded-md relative overflow-hidden">
                      {/* Bar */}
                      {milestone.durationDays > 0 && (
                        <div
                          className={`absolute top-1 bottom-1 rounded ${getPhaseColor(milestone.phase)} flex items-center justify-center transition-all`}
                          style={{
                            left: `${offsetPercent}%`,
                            width: `${Math.max(widthPercent, 2)}%`,
                          }}
                        >
                          <span className="text-xs font-medium text-white px-1 truncate">
                            {widthPercent > 8 ? formatDateDisplay(milestone.start) : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* End date */}
                    <div className="w-24 flex-shrink-0 text-left">
                      <span className="text-xs text-muted-foreground">
                        {formatDateDisplay(milestone.start)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-6">
              <div>
                <span className="text-xs text-muted-foreground block">Project Start</span>
                <span className="text-sm font-medium text-foreground">
                  {milestones[0] ? formatDateDisplay(milestones[0].start) : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Project End</span>
                <span className="text-sm font-medium text-foreground">
                  {milestones[milestones.length - 1] ? formatDateDisplay(milestones[milestones.length - 1].end) : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Total Duration</span>
                <span className="text-sm font-medium text-foreground">{totalDays} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
