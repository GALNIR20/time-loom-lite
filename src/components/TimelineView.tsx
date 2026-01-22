import { MilestoneState } from '@/types/timeline';
import { formatDateDisplay } from '@/lib/timeline';
import { X, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { GanttBar } from '@/components/GanttBar';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { parseISO, differenceInDays, addDays, startOfWeek, format, differenceInWeeks, addWeeks, startOfQuarter, differenceInQuarters, addQuarters } from 'date-fns';

interface TimelineViewProps {
  milestones: MilestoneState[];
  featureName?: string;
  preset?: string;
  isOpen: boolean;
  onClose: () => void;
  onDaysChange: (id: string, value: number | null) => void;
  onRemoveMilestone: (id: string) => void;
}

type ViewMode = 'days' | 'weeks' | 'quarters' | 'milestones';

export function TimelineView({ milestones, featureName, preset, isOpen, onClose, onDaysChange, onRemoveMilestone }: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('weeks');
  const [editMode, setEditMode] = useState(false);

  const handleDaysUpdate = useCallback((id: string, days: number) => {
    onDaysChange(id, days);
  }, [onDaysChange]);

  const { totalDays, startDate, endDate, weeks, quarters } = useMemo(() => {
    if (milestones.length === 0) return { totalDays: 0, startDate: new Date(), endDate: new Date(), weeks: [], quarters: [] };
    
    const start = parseISO(milestones[0].start);
    const end = parseISO(milestones[milestones.length - 1].end);
    const days = differenceInDays(end, start);
    
    // Generate weeks
    const weekStart = startOfWeek(start, { weekStartsOn: 1 });
    const weekCount = Math.ceil(differenceInDays(end, weekStart) / 7) + 1;
    const weeksArr = Array.from({ length: weekCount }, (_, i) => addWeeks(weekStart, i));
    
    // Generate quarters
    const qStart = startOfQuarter(start);
    const qCount = differenceInQuarters(end, qStart) + 2;
    const quartersArr = Array.from({ length: qCount }, (_, i) => addQuarters(qStart, i));
    
    return {
      totalDays: days,
      startDate: start,
      endDate: end,
      weeks: weeksArr,
      quarters: quartersArr,
    };
  }, [milestones]);

  // Initialize drag hook
  const { handleDragStart, getPreviewDays, isDraggingMilestone, isDragging } = useGanttDrag({
    totalDays,
    onDaysChange: handleDaysUpdate,
  });

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

  const getMilestoneColor = (milestoneId: string) => {
    const baseId = milestoneId.replace(/-\d+$/, '');
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
        return 'bg-muted';
    }
  };

  const getBarPosition = (milestone: MilestoneState) => {
    const milestoneStart = parseISO(milestone.start);
    const offsetDays = differenceInDays(milestoneStart, startDate);
    const offsetPercent = totalDays > 0 ? (offsetDays / totalDays) * 100 : 0;
    const widthPercent = totalDays > 0 ? (milestone.durationDays / totalDays) * 100 : 0;
    return { offsetPercent, widthPercent };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Timeline View</h2>
            {(featureName || preset) && (
              <span className="text-sm text-muted-foreground">
                —{featureName && <span className="font-medium text-foreground"> {featureName}</span>}
                {preset && <span className="ml-1">({preset} PLC)</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Edit Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={editMode} 
                onCheckedChange={(checked) => setEditMode(checked === true)}
              />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Edit Mode
              </span>
            </label>
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode('days')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'days' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Days
              </button>
              <button
                onClick={() => setViewMode('weeks')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-x border-border ${
                  viewMode === 'weeks' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Weeks
              </button>
              <button
                onClick={() => setViewMode('quarters')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-border ${
                  viewMode === 'quarters' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Quarters
              </button>
              <button
                onClick={() => setViewMode('milestones')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'milestones' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Milestones
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="Close timeline view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
          <span className="text-xs text-muted-foreground">Development</span>
        </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'milestones' ? (
            /* Visual Milestones View */
            <div className="p-6 overflow-x-auto">
              <div className="relative min-w-[800px]">
                {/* Milestone nodes with connectors */}
                <div className="flex items-start relative">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="flex items-start">
                      {/* Milestone node */}
                      <div className="flex flex-col items-center">
                        {/* Node circle */}
                        <div 
                          className={`w-12 h-12 rounded-full ${getMilestoneColor(milestone.id)} flex items-center justify-center shadow-lg z-10 border-4 border-card`}
                        >
                          <span className="text-xs font-bold text-white">{index + 1}</span>
                        </div>
                        
                        {/* Milestone info */}
                        <div className="mt-3 text-center max-w-[100px]">
                          <span className="text-sm font-semibold text-foreground block truncate">
                            {milestone.name}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1">
                            {formatDateDisplay(milestone.start)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Connector between nodes */}
                      {index < milestones.length - 1 && (
                        <div className="flex flex-col items-center mx-2" style={{ marginTop: '20px' }}>
                          {/* Line and days input */}
                          <div className="flex items-center">
                            <div className={`h-1 ${editMode ? 'w-8' : 'w-16'} ${getMilestoneColor(milestone.id)}`} />
                            {editMode && (
                              <div className="flex flex-col items-center mx-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={milestone.durationDays}
                                  onChange={(e) => handleDaysInput(milestone.id, e.target.value)}
                                  className="input-field w-14 text-center text-xs py-1"
                                  aria-label={`Days for ${milestone.name}`}
                                />
                                <span className="text-[10px] text-muted-foreground mt-0.5">days</span>
                              </div>
                            )}
                            <div className={`h-1 ${editMode ? 'w-8' : 'w-16'} ${getMilestoneColor(milestones[index + 1].id)}`} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Gantt Chart View */
            <div className="min-w-[900px]">
              {/* Calendar Header */}
              <div className="flex border-b border-border sticky top-0 bg-card z-10">
                {/* Milestone column header */}
                <div className="w-32 flex-shrink-0 p-2 border-r border-border">
                  <span className="text-xs font-medium text-muted-foreground">Milestone</span>
                </div>
                {/* Days column header - only show in edit mode */}
                {editMode && (
                  <div className="w-16 flex-shrink-0 p-2 border-r border-border">
                    <span className="text-xs font-medium text-muted-foreground">Days</span>
                  </div>
                )}
                {/* Next column header - only show in edit mode */}
                {editMode && (
                  <div className="w-28 flex-shrink-0 p-2 border-r border-border">
                    <span className="text-xs font-medium text-muted-foreground">Next</span>
                  </div>
                )}
                {/* Calendar columns */}
                <div className="flex-1 flex">
                  {viewMode === 'weeks' && weeks.map((week, i) => (
                    <div 
                      key={i} 
                      className="flex-1 min-w-[60px] p-2 text-center border-r border-border last:border-r-0 bg-muted/20"
                    >
                      <span className="text-[10px] font-medium text-muted-foreground block">
                        W{format(week, 'w')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(week, 'MMM d')}
                      </span>
                    </div>
                  ))}
                  {viewMode === 'quarters' && quarters.map((q, i) => (
                    <div 
                      key={i} 
                      className="flex-1 min-w-[80px] p-2 text-center border-r border-border last:border-r-0 bg-muted/20"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        Q{Math.ceil((parseISO(format(q, 'yyyy-MM-dd')).getMonth() + 1) / 3)} {format(q, 'yyyy')}
                      </span>
                    </div>
                  ))}
                  {viewMode === 'days' && (
                    <div className="flex-1 p-2 text-center bg-muted/20">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(startDate, 'MMM d')} — {format(endDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Milestone rows */}
              {milestones.map((milestone, index) => {
                const previewDays = editMode ? getPreviewDays(milestone.id, milestone.durationDays) : milestone.durationDays;
                const milestoneStart = parseISO(milestone.start);
                const offsetDays = differenceInDays(milestoneStart, startDate);
                const offsetPercent = totalDays > 0 ? (offsetDays / totalDays) * 100 : 0;
                const widthPercent = totalDays > 0 ? (previewDays / totalDays) * 100 : 0;
                const nextMilestone = index < milestones.length - 1 ? milestones[index + 1] : null;

                return (
                  <div key={milestone.id} className="flex border-b border-border hover:bg-muted/10 transition-colors">
                    {/* Milestone name */}
                    <div className="w-32 flex-shrink-0 p-3 border-r border-border">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {milestone.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateDisplay(milestone.start)}
                      </span>
                    </div>
                    
                    {/* Days input - only show in edit mode */}
                    {editMode && (
                      <div className="w-16 flex-shrink-0 p-2 border-r border-border flex items-center justify-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={previewDays}
                          onChange={(e) => handleDaysInput(milestone.id, e.target.value)}
                          className="input-field w-14 text-center text-xs py-1"
                          aria-label={`Days for ${milestone.name}`}
                        />
                      </div>
                    )}

                    {/* Next milestone - only show in edit mode */}
                    {editMode && (
                      <div className="w-28 flex-shrink-0 p-3 border-r border-border flex items-center">
                        <span className="text-sm font-medium text-foreground truncate">
                          {nextMilestone ? nextMilestone.name : '—'}
                        </span>
                      </div>
                    )}

                    {/* Remove button - only show in edit mode */}
                    {editMode && (
                      <div className="w-10 flex-shrink-0 p-2 border-r border-border flex items-center justify-center">
                        <button
                          onClick={() => onRemoveMilestone(milestone.id)}
                          className="btn-ghost text-muted-foreground hover:text-destructive p-1"
                          aria-label={`Remove ${milestone.name}`}
                          title="Remove milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Gantt bar */}
                    <div className="flex-1 p-2 relative">
                      <div className="h-8 w-full relative">
                        {/* Grid lines for weeks/quarters */}
                        {viewMode === 'weeks' && weeks.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-r border-border/50"
                            style={{ left: `${((i + 1) / weeks.length) * 100}%` }}
                          />
                        ))}
                        {viewMode === 'quarters' && quarters.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-r border-border/50"
                            style={{ left: `${((i + 1) / quarters.length) * 100}%` }}
                          />
                        ))}
                        
                        {/* Bar with drag support */}
                        <GanttBar
                          milestoneId={milestone.id}
                          milestoneName={milestone.name}
                          phaseName={milestone.phase}
                          durationDays={previewDays}
                          startDate={milestone.start}
                          endDate={milestone.end}
                          offsetPercent={offsetPercent}
                          widthPercent={widthPercent}
                          editMode={editMode}
                          isDragging={isDraggingMilestone(milestone.id)}
                          onDragStart={handleDragStart}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex flex-wrap gap-6">
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
          <div>
            <span className="text-xs text-muted-foreground block">Total Weeks</span>
            <span className="text-sm font-medium text-foreground">{Math.ceil(totalDays / 7)} weeks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
