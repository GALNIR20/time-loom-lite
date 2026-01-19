import { MilestoneState, MilestoneConfig } from '@/types/timeline';
import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { X, ArrowRight, Trash2, RotateCcw, ChevronDown, ChevronUp, Merge, Unlink } from 'lucide-react';
import { useState } from 'react';
import { parseISO, format, getYear, getWeek } from 'date-fns';

// Discovery meetings configuration: maps milestone id to its discovery meetings
const DISCOVERY_MEETINGS: Record<string, string[]> = {
  'brief': ['Pre-Concept Discovery'],
  'pre-concept': ['Concept Discovery'],
  'concept': ['Pre-Sketch Discovery'],
  'sketch': ['Sketch Discovery', 'Tech Plan', 'Art Dev Plan'],
};

interface MilestoneTableProps {
  milestones: MilestoneState[];
  showDetailed: boolean;
  useWorkDays: boolean;
  onDaysChange: (id: string, value: number | null) => void;
  onRemoveMilestone: (id: string) => void;
  onMergeMilestones: (sourceId: string, targetId: string) => void;
  hiddenMilestones: Set<string>;
  allMilestones: MilestoneConfig[];
  onRestoreMilestone: (id: string) => void;
  mergedMilestones: Record<string, string[]>;
  onUnmergeMilestone: (targetId: string, sourceName: string) => void;
}

// Convert calendar days to work days (5 work days per week)
function calendarToWorkDays(calendarDays: number): number {
  const weeks = Math.floor(calendarDays / 7);
  const remainingDays = calendarDays % 7;
  // Each full week = 5 work days, remaining days capped at 5
  return weeks * 5 + Math.min(remainingDays, 5);
}

// Calculate sprint code based on start date (2.YWW format - single digit year + 2-digit week)
function getSprintCode(startDate: string): string {
  const date = parseISO(startDate);
  const year = getYear(date) % 10; // Get last single digit of year
  const week = getWeek(date, { weekStartsOn: 1 }); // ISO week starts on Monday
  return `2.${year}${week.toString().padStart(2, '0')}`;
}

// Format date as D.M (day.month)
function formatShortDate(isoDate: string): string {
  const date = parseISO(isoDate);
  return format(date, 'd.M');
}

// Get sprint display name: "Sprint X (2.YWW)"
function getSprintDisplayName(milestone: MilestoneState): string {
  const sprintNumber = milestone.id.replace('sprint-', '');
  const sprintCode = getSprintCode(milestone.start);
  return `Sprint ${sprintNumber} (${sprintCode})`;
}

export function MilestoneTable({
  milestones,
  showDetailed,
  useWorkDays,
  onDaysChange,
  onRemoveMilestone,
  onMergeMilestones,
  hiddenMilestones,
  allMilestones,
  onRestoreMilestone,
  mergedMilestones,
  onUnmergeMilestone,
}: MilestoneTableProps) {
  const [showHidden, setShowHidden] = useState(false);
  const [expandedDiscovery, setExpandedDiscovery] = useState<Set<string>>(new Set());
  const [mergeDropdownOpen, setMergeDropdownOpen] = useState<string | null>(null);
  const hiddenList = allMilestones.filter((m) => hiddenMilestones.has(m.id));
  
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

  const toggleDiscovery = (id: string) => {
    setExpandedDiscovery((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get display name including merged milestones, with special format for sprints
  const getDisplayName = (milestone: MilestoneState) => {
    // Special formatting for sprints
    if (milestone.id.startsWith('sprint-')) {
      return getSprintDisplayName(milestone);
    }
    const merged = mergedMilestones[milestone.id];
    if (merged && merged.length > 0) {
      return `${milestone.name} + ${merged.join(' + ')}`;
    }
    return milestone.name;
  };

  const getNextMilestoneName = (index: number) => {
    return index < milestones.length - 1 ? milestones[index + 1].name : '—';
  };

  const getMergeTargets = (currentIndex: number) => {
    // Can merge with previous or next milestone
    const targets: { id: string; name: string; direction: 'prev' | 'next' }[] = [];
    if (currentIndex > 0) {
      targets.push({
        id: milestones[currentIndex - 1].id,
        name: milestones[currentIndex - 1].name,
        direction: 'prev',
      });
    }
    if (currentIndex < milestones.length - 1) {
      targets.push({
        id: milestones[currentIndex + 1].id,
        name: milestones[currentIndex + 1].name,
        direction: 'next',
      });
    }
    return targets;
  };

  const handleMerge = (sourceId: string, targetId: string) => {
    onMergeMilestones(sourceId, targetId);
    setMergeDropdownOpen(null);
  };

  return (
    <div className="table-container">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-header-cell">Date</th>
              <th className="table-header-cell">Milestone</th>
              <th className="table-header-cell w-10"></th>
              <th className="table-header-cell">
                Days {useWorkDays && <span className="text-xs font-normal text-primary/60">(work)</span>}
              </th>
              <th className="table-header-cell">Next Milestone</th>
              <th className="table-header-cell">Phase</th>
              <th className="table-header-cell w-12 text-center">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone, index) => (
              <>
                <tr key={milestone.id} className="table-body-row">
                  <td className="table-body-cell text-muted-foreground whitespace-nowrap">
                    {formatDateDisplay(milestone.start)}
                  </td>
                  <td className="table-body-cell font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="whitespace-nowrap">{getDisplayName(milestone)}</span>
                      {!milestone.id.startsWith('sprint-') && mergedMilestones[milestone.id]?.map((mergedName) => (
                        <span
                          key={mergedName}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/20 text-warning rounded-full text-xs"
                        >
                          + {mergedName}
                          <button
                            onClick={() => onUnmergeMilestone(milestone.id, mergedName)}
                            className="hover:bg-warning/30 rounded-full p-0.5 transition-colors"
                            aria-label={`Unmerge ${mergedName}`}
                            title="Unmerge"
                          >
                            <Unlink className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="table-body-cell text-center px-2">
                    {DISCOVERY_MEETINGS[milestone.id] ? (
                      <button
                        onClick={() => toggleDiscovery(milestone.id)}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label={`Toggle discovery meetings for ${milestone.name}`}
                      >
                        {expandedDiscovery.has(milestone.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                    )}
                  </td>
                  <td className="table-body-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={milestone.durationDays}
                          onChange={(e) => handleDaysInput(milestone.id, e.target.value)}
                          className="input-field w-20 text-center"
                          aria-label={`Days for ${milestone.name}`}
                        />
                        {milestone.overrideDays !== null && (
                          <button
                            onClick={() => onDaysChange(milestone.id, null)}
                            className="btn-ghost"
                            aria-label={`Reset days for ${milestone.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {useWorkDays && milestone.durationDays > 0 && (
                        <span className="text-xs text-success font-medium px-1.5 py-0.5 bg-success/10 rounded">
                          {calendarToWorkDays(milestone.durationDays)}w
                        </span>
                      )}
                      {milestone.durationDays === 0 && getMergeTargets(index).length > 0 && (
                        <div className="relative">
                          <button
                            onClick={() => setMergeDropdownOpen(mergeDropdownOpen === milestone.id ? null : milestone.id)}
                            className="btn-ghost text-warning hover:text-warning p-1"
                            aria-label={`Merge ${milestone.name} with another milestone`}
                            title="Merge milestone"
                          >
                            <Merge className="w-4 h-4" />
                          </button>
                          {mergeDropdownOpen === milestone.id && (
                            <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg min-w-[180px] py-1">
                              <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
                                Merge with:
                              </div>
                              {getMergeTargets(index).map((target) => (
                                <button
                                  key={target.id}
                                  onClick={() => handleMerge(milestone.id, target.id)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                >
                                  <ArrowRight className={`w-3 h-3 ${target.direction === 'prev' ? 'rotate-180' : ''}`} />
                                  <span>{target.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-body-cell text-muted-foreground whitespace-nowrap">
                    {getNextMilestoneName(index)}
                  </td>
                  <td className="table-body-cell">
                    <span
                      className={
                        milestone.phase === 'Concept Phase'
                          ? 'phase-badge-concept'
                          : milestone.phase === 'Sketch Phase'
                          ? 'phase-badge-sketch'
                          : 'phase-badge-development'
                      }
                    >
                      {milestone.phase}
                    </span>
                  </td>
                  <td className="table-body-cell text-center px-2">
                    <button
                      onClick={() => onRemoveMilestone(milestone.id)}
                      className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Remove ${milestone.name}`}
                      title="Remove milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {/* Discovery meetings expandable row */}
                {DISCOVERY_MEETINGS[milestone.id] && expandedDiscovery.has(milestone.id) && (
                  <tr key={`${milestone.id}-discovery`} className="border-t border-border/50 bg-muted/20">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="space-y-2">
                        {DISCOVERY_MEETINGS[milestone.id].map((meeting) => (
                          <div
                            key={meeting}
                            className="flex items-center gap-2 p-2 rounded-md bg-background/50"
                          >
                            <span
                              className={`text-[10px] ${
                                milestone.phase === 'Concept Phase'
                                  ? 'phase-badge-concept'
                                  : milestone.phase === 'Sketch Phase'
                                  ? 'phase-badge-sketch'
                                  : 'phase-badge-development'
                              }`}
                            >
                              Discovery
                            </span>
                            <span className="text-sm font-medium">{meeting}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-border">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="p-3 space-y-2">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span
                  className={`text-[10px] ${
                    milestone.phase === 'Concept Phase'
                      ? 'phase-badge-concept'
                      : milestone.phase === 'Sketch Phase'
                      ? 'phase-badge-sketch'
                      : 'phase-badge-development'
                  }`}
                >
                  {milestone.phase}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-medium text-foreground text-sm truncate">{getDisplayName(milestone)}</h3>
                  {!milestone.id.startsWith('sprint-') && mergedMilestones[milestone.id]?.map((mergedName) => (
                    <span
                      key={mergedName}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning/20 text-warning rounded-full text-[10px]"
                    >
                      + {mergedName}
                      <button
                        onClick={() => onUnmergeMilestone(milestone.id, mergedName)}
                        className="hover:bg-warning/30 rounded-full p-0.5 transition-colors"
                        aria-label={`Unmerge ${mergedName}`}
                      >
                        <Unlink className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDateDisplay(milestone.start)}
                </span>
                <button
                  onClick={() => onRemoveMilestone(milestone.id)}
                  className="btn-ghost text-muted-foreground hover:text-destructive p-1"
                  aria-label={`Remove ${milestone.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Days input row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={milestone.durationDays}
                  onChange={(e) => handleDaysInput(milestone.id, e.target.value)}
                  className="input-field w-14 text-center text-xs py-1"
                  aria-label={`Days for ${milestone.name}`}
                />
                <span className="text-xs text-muted-foreground">days</span>
                {useWorkDays && milestone.durationDays > 0 && (
                  <span className="text-[10px] text-success font-medium px-1 py-0.5 bg-success/10 rounded">
                    {calendarToWorkDays(milestone.durationDays)}w
                  </span>
                )}
                {milestone.overrideDays !== null && (
                  <button
                    onClick={() => onDaysChange(milestone.id, null)}
                    className="btn-ghost p-1"
                    aria-label={`Reset days for ${milestone.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {/* Merge button - appears when days is 0 */}
                {milestone.durationDays === 0 && getMergeTargets(index).length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setMergeDropdownOpen(mergeDropdownOpen === milestone.id ? null : milestone.id)}
                      className="btn-ghost text-warning hover:text-warning p-1"
                      aria-label={`Merge ${milestone.name}`}
                      title="Merge milestone"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                    {mergeDropdownOpen === milestone.id && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[160px] py-1">
                        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
                          Merge with:
                        </div>
                        {getMergeTargets(index).map((target) => (
                          <button
                            key={target.id}
                            onClick={() => handleMerge(milestone.id, target.id)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <ArrowRight className={`w-3 h-3 ${target.direction === 'prev' ? 'rotate-180' : ''}`} />
                            <span>{target.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {showDetailed && (
                <span className="text-[10px] text-muted-foreground">
                  ({formatDuration(milestone.durationDays, true).split('(')[1]?.replace(')', '') || ''})
                </span>
              )}
            </div>

            {/* Discovery meetings expandable */}
            {DISCOVERY_MEETINGS[milestone.id] && (
              <div className="border-t border-border/50">
                <button
                  onClick={() => toggleDiscovery(milestone.id)}
                  className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Discovery meetings ({DISCOVERY_MEETINGS[milestone.id].length})</span>
                  {expandedDiscovery.has(milestone.id) ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {expandedDiscovery.has(milestone.id) && (
                  <div className="pb-2 space-y-1.5">
                    {DISCOVERY_MEETINGS[milestone.id].map((meeting) => (
                      <div
                        key={meeting}
                        className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30"
                      >
                        <span
                          className={`text-[9px] ${
                            milestone.phase === 'Concept Phase'
                              ? 'phase-badge-concept'
                              : milestone.phase === 'Sketch Phase'
                              ? 'phase-badge-sketch'
                              : 'phase-badge-execution'
                          }`}
                        >
                          Discovery
                        </span>
                        <span className="text-xs font-medium">{meeting}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next milestone */}
            {index < milestones.length - 1 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{milestones[index + 1].name}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hidden Milestones Section */}
      {hiddenList.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <span>Removed milestones ({hiddenList.length})</span>
            {showHidden ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHidden && (
            <div className="px-4 pb-3 space-y-2">
              {hiddenList.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] ${
                        m.phase === 'Concept Phase'
                          ? 'phase-badge-concept'
                          : m.phase === 'Sketch Phase'
                          ? 'phase-badge-sketch'
                          : 'phase-badge-execution'
                      }`}
                    >
                      {m.phase}
                    </span>
                    <span className="text-sm font-medium">{m.name}</span>
                  </div>
                  <button
                    onClick={() => onRestoreMilestone(m.id)}
                    className="btn-ghost text-muted-foreground hover:text-primary p-1 flex items-center gap-1 text-xs"
                    aria-label={`Restore ${m.name}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
