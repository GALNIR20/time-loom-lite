import { MilestoneState } from '@/types/timeline';
import { formatDateDisplay } from '@/lib/timeline';
import { X, Pencil, Trash2, Check, Sparkles, Copy, Camera } from 'lucide-react';
import { useMemo, useState, useCallback, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { GanttBar } from '@/components/GanttBar';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { parseISO, differenceInDays, addDays, startOfWeek, format, differenceInWeeks, addWeeks, startOfQuarter, differenceInQuarters, addQuarters, startOfMonth, differenceInMonths, addMonths } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface TimelineViewProps {
  milestones: MilestoneState[];
  featureName?: string;
  preset?: string;
  isOpen: boolean;
  onClose: () => void;
  onDaysChange: (id: string, value: number | null) => void;
  onRemoveMilestone: (id: string) => void;
}

type ViewMode = 'days' | 'weeks' | 'months' | 'quarters' | 'milestones';

export function TimelineView({ milestones, featureName, preset, isOpen, onClose, onDaysChange, onRemoveMilestone }: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('milestones');
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [screenshotCopied, setScreenshotCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const milestonesRef = useRef<HTMLDivElement>(null);

  const handleDaysUpdate = useCallback((id: string, days: number) => {
    onDaysChange(id, days);
  }, [onDaysChange]);

  const { totalDays, startDate, endDate, weeks, months, quarters, timelineStart } = useMemo(() => {
    if (milestones.length === 0) return { totalDays: 0, startDate: new Date(), endDate: new Date(), weeks: [], months: [], quarters: [], timelineStart: new Date() };
    
    const start = parseISO(milestones[0].start);
    const end = parseISO(milestones[milestones.length - 1].end);
    const days = differenceInDays(end, start);
    
    // Generate weeks
    const weekStart = startOfWeek(start, { weekStartsOn: 1 });
    const weekCount = Math.ceil(differenceInDays(end, weekStart) / 7) + 1;
    const weeksArr = Array.from({ length: weekCount }, (_, i) => addWeeks(weekStart, i));
    
    // Generate months
    const monthStart = startOfMonth(start);
    const monthCount = differenceInMonths(end, monthStart) + 2;
    const monthsArr = Array.from({ length: monthCount }, (_, i) => addMonths(monthStart, i));
    
    // Generate quarters
    const qStart = startOfQuarter(start);
    const qCount = differenceInQuarters(end, qStart) + 2;
    const quartersArr = Array.from({ length: qCount }, (_, i) => addQuarters(qStart, i));
    
    return {
      totalDays: days,
      startDate: start,
      endDate: end,
      weeks: weeksArr,
      months: monthsArr,
      quarters: quartersArr,
      timelineStart: weekStart, // Use week start for alignment
    };
  }, [milestones]);

  // Initialize drag hook
  const { handleDragStart, getPreviewDays, isDraggingMilestone, isDragging } = useGanttDrag({
    totalDays,
    onDaysChange: handleDaysUpdate,
  });

  // Generate shareable summary text - must be before early return
  const generateSummaryText = useCallback(() => {
    if (milestones.length === 0) return '';
    
    const projectName = featureName || 'Untitled Project';
    const presetName = preset || 'Custom';
    
    // Build milestone list with start date only - milestone names in bold
    const milestoneLines = milestones.map(m => 
      `  • *${m.name}*: ${formatDateDisplay(m.start)}`
    ).join('\n');
    
    const summary = `Hey all, sharing with you the PLC dates for:

📊 *${projectName}*

🏷️ *PLC Size:* ${presetName}

📅 *PLC Milestones:*
${milestoneLines}`;
    
    return summary;
  }, [milestones, featureName, preset]);

  // Copy text summary to clipboard
  const handleCopySummary = useCallback(async () => {
    const summary = generateSummaryText();
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Summary copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy summary');
    }
  }, [generateSummaryText]);

  // Capture screenshot and copy to clipboard
  const handleCaptureScreenshot = useCallback(async () => {
    if (!milestonesRef.current) {
      toast.error('Unable to capture screenshot');
      return;
    }

    setIsCapturing(true);
    try {
      // Capture screenshot with extra padding to prevent text cutoff
      const canvas = await html2canvas(milestonesRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: milestonesRef.current.scrollWidth + 40,
        height: milestonesRef.current.scrollHeight + 20,
        x: -20,
        y: -10,
      });

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) {
        throw new Error('Failed to create image');
      }

      // Try to copy to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setScreenshotCopied(true);
        toast.success('Screenshot copied to clipboard!');
        setTimeout(() => setScreenshotCopied(false), 2000);
      } catch (clipboardErr) {
        // Fallback: download the image if clipboard fails
        console.error('Clipboard write failed:', clipboardErr);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${featureName || 'timeline'}-plc.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setScreenshotCopied(true);
        toast.success('Screenshot downloaded (clipboard not supported)');
        setTimeout(() => setScreenshotCopied(false), 2000);
      }
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      toast.error('Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
    }
  }, [featureName]);

  // Early return after all hooks
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
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  viewMode === 'weeks' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Weeks
              </button>
              <button
                onClick={() => setViewMode('months')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  viewMode === 'months' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Months
              </button>
              <button
                onClick={() => setViewMode('quarters')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  viewMode === 'quarters' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                Quarters
              </button>
              <button
                onClick={() => setViewMode('milestones')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
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
        <div className="flex-1 overflow-auto" ref={milestonesRef}>
          {viewMode === 'milestones' ? (
            /* Visual Milestones View */
            <div className="p-6 overflow-x-auto bg-card">
              <div className="relative min-w-[800px] pr-8">
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
                          <span className="text-sm font-bold text-white leading-none">{index + 1}</span>
                        </div>
                        
                        {/* Milestone info */}
                        <div className="mt-3 text-center min-w-[100px]">
                          <span className="text-sm font-semibold text-foreground block">
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
                      className="min-w-[80px] w-[80px] p-2 text-center border-r border-border last:border-r-0 bg-muted/20"
                    >
                      <span className="text-[10px] font-medium text-muted-foreground block">
                        W{format(week, 'w')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(week, 'MMM d')}
                      </span>
                    </div>
                  ))}
                  {viewMode === 'months' && months.map((month, i) => (
                    <div 
                      key={i} 
                      className="min-w-[120px] w-[120px] p-2 text-center border-r border-border last:border-r-0 bg-muted/20"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(month, 'MMM yyyy')}
                      </span>
                    </div>
                  ))}
                  {viewMode === 'quarters' && quarters.map((q, i) => (
                    <div 
                      key={i} 
                      className="min-w-[150px] w-[150px] p-2 text-center border-r border-border last:border-r-0 bg-muted/20"
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
                const nextMilestone = index < milestones.length - 1 ? milestones[index + 1] : null;
                
                // Calculate position based on view mode
                let offsetPercent = 0;
                let widthPercent = 0;
                
                if (viewMode === 'days') {
                  // Days view: percentage of total days
                  const offsetDays = differenceInDays(milestoneStart, startDate);
                  offsetPercent = totalDays > 0 ? (offsetDays / totalDays) * 100 : 0;
                  widthPercent = totalDays > 0 ? (previewDays / totalDays) * 100 : 0;
                } else if (viewMode === 'weeks') {
                  // Weeks view: each week column is 80px fixed
                  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
                  const offsetDays = differenceInDays(milestoneStart, weekStart);
                  const totalWeekDays = weeks.length * 7;
                  offsetPercent = totalWeekDays > 0 ? (offsetDays / totalWeekDays) * 100 : 0;
                  widthPercent = totalWeekDays > 0 ? (previewDays / totalWeekDays) * 100 : 0;
                } else if (viewMode === 'months') {
                  // Months view: position relative to month boundaries
                  const monthStart = startOfMonth(startDate);
                  const offsetDays = differenceInDays(milestoneStart, monthStart);
                  const totalMonthDays = months.length * 30; // Approximate
                  offsetPercent = totalMonthDays > 0 ? (offsetDays / totalMonthDays) * 100 : 0;
                  widthPercent = totalMonthDays > 0 ? (previewDays / totalMonthDays) * 100 : 0;
                } else if (viewMode === 'quarters') {
                  // Quarters view: position relative to quarter boundaries
                  const qStart = startOfQuarter(startDate);
                  const offsetDays = differenceInDays(milestoneStart, qStart);
                  const totalQuarterDays = quarters.length * 91; // ~3 months per quarter
                  offsetPercent = totalQuarterDays > 0 ? (offsetDays / totalQuarterDays) * 100 : 0;
                  widthPercent = totalQuarterDays > 0 ? (previewDays / totalQuarterDays) * 100 : 0;
                }

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
                    <div className="flex-1 p-2 relative overflow-visible">
                      <div className="h-8 w-full relative">
                        {/* Grid lines for weeks/months/quarters */}
                        {viewMode === 'weeks' && weeks.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-r border-border/50"
                            style={{ left: `${((i + 1) / weeks.length) * 100}%` }}
                          />
                        ))}
                        {viewMode === 'months' && months.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-r border-border/50"
                            style={{ left: `${((i + 1) / months.length) * 100}%` }}
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
        <div className="p-4 border-t border-border bg-muted/30 flex flex-wrap items-center gap-6">
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
          
          {/* Generate Summary Button - Right aligned */}
          <div className="ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end" side="top">
                <div className="p-3 border-b border-border">
                  <h3 className="font-medium text-sm text-foreground">Share Timeline</h3>
                  <p className="text-xs text-muted-foreground mt-1">Copy summary text or download screenshot</p>
                </div>
                <div className="p-3">
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap text-foreground font-mono">
                    {generateSummaryText()}
                  </pre>
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <button
                    onClick={handleCopySummary}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Message'}
                  </button>
                  <button
                    onClick={handleCaptureScreenshot}
                    disabled={isCapturing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {screenshotCopied ? <Check className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    {isCapturing ? 'Capturing...' : screenshotCopied ? 'Downloaded!' : 'Screenshot'}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
