import { MilestoneState } from '@/types/timeline';
import { formatDateDisplay } from '@/lib/timeline';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { parseISO, differenceInDays } from 'date-fns';

interface TimelineViewProps {
  milestones: MilestoneState[];
  isOpen: boolean;
  onClose: () => void;
  onDaysChange: (id: string, value: number | null) => void;
}

export function TimelineView({ milestones, isOpen, onClose, onDaysChange }: TimelineViewProps) {
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

  const handleDaysInput = (id: string, value: string) => {
    if (value === '') {
      onDaysChange(id, null);
      return;
    }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onDaysChange(id, parsed);
    }
  };

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
          <div className="flex gap-6">
            {/* Left side: Milestone list with next milestone */}
            <div className="w-44 flex-shrink-0">
              {milestones.map((milestone, index) => {
                const nextMilestone = index < milestones.length - 1 ? milestones[index + 1] : null;
                
                return (
                  <div key={milestone.id} className="border-b border-border last:border-b-0">
                    {/* Current Milestone */}
                    <div className="py-3">
                      <span className="text-base font-medium text-foreground block">
                        {milestone.name}
                      </span>
                    </div>
                    {/* Next Milestone (shown below, lighter) */}
                    {nextMilestone && (
                      <div className="pb-3">
                        <span className="text-base text-muted-foreground block">
                          {nextMilestone.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Middle: Days input */}
            <div className="w-20 flex-shrink-0">
              <div className="text-xs font-medium text-muted-foreground mb-2">Days</div>
              {milestones.map((milestone, index) => {
                const nextMilestone = index < milestones.length - 1 ? milestones[index + 1] : null;
                const rowHeight = nextMilestone ? 'h-[88px]' : 'h-[52px]';
                
                return (
                  <div key={milestone.id} className={`${rowHeight} flex items-start pt-3 border-b border-border last:border-b-0`}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={milestone.durationDays}
                      onChange={(e) => handleDaysInput(milestone.id, e.target.value)}
                      className="input-field w-16 text-center text-sm py-1"
                      aria-label={`Days for ${milestone.name}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Right side: Gantt chart */}
            <div className="flex-1 min-w-[300px]">
              <div className="text-xs font-medium text-muted-foreground mb-2">Timeline</div>
              {milestones.map((milestone, index) => {
                const milestoneStart = parseISO(milestone.start);
                const offsetDays = differenceInDays(milestoneStart, startDate);
                const offsetPercent = totalDays > 0 ? (offsetDays / totalDays) * 100 : 0;
                const widthPercent = totalDays > 0 ? (milestone.durationDays / totalDays) * 100 : 0;
                const nextMilestone = index < milestones.length - 1 ? milestones[index + 1] : null;
                const rowHeight = nextMilestone ? 'h-[88px]' : 'h-[52px]';

                return (
                  <div key={milestone.id} className={`${rowHeight} flex flex-col justify-start pt-3 border-b border-border last:border-b-0`}>
                    <div className="h-8 bg-muted/30 rounded-md relative overflow-hidden">
                      {milestone.durationDays > 0 && (
                        <div
                          className={`absolute top-1 bottom-1 rounded ${getPhaseColor(milestone.phase)} flex items-center transition-all`}
                          style={{
                            left: `${offsetPercent}%`,
                            width: `${Math.max(widthPercent, 3)}%`,
                          }}
                        >
                          <span className="text-[10px] font-medium text-white px-2 truncate">
                            {widthPercent > 10 ? `${milestone.durationDays}d` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDateDisplay(milestone.start)}
                    </span>
                  </div>
                );
              })}
            </div>
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
  );
}
