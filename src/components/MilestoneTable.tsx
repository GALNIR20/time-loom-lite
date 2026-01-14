import { MilestoneState, MilestoneConfig } from '@/types/timeline';
import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { X, ArrowRight, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

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
  onDaysChange: (id: string, value: number | null) => void;
  onRemoveMilestone: (id: string) => void;
  hiddenMilestones: Set<string>;
  allMilestones: MilestoneConfig[];
  onRestoreMilestone: (id: string) => void;
}

export function MilestoneTable({
  milestones,
  showDetailed,
  onDaysChange,
  onRemoveMilestone,
  hiddenMilestones,
  allMilestones,
  onRestoreMilestone,
}: MilestoneTableProps) {
  const [showHidden, setShowHidden] = useState(false);
  const [expandedDiscovery, setExpandedDiscovery] = useState<Set<string>>(new Set());
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

  const getNextMilestoneName = (index: number) => {
    return index < milestones.length - 1 ? milestones[index + 1].name : '—';
  };

  return (
    <div className="card-elevated overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-table-header border-b border-table-border">
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Date
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Milestone
              </th>
              <th className="text-center px-2 py-3 font-semibold text-foreground whitespace-nowrap w-10">
                
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Days
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Next Milestone
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Phase
              </th>
              <th className="text-center px-4 py-3 font-semibold text-foreground whitespace-nowrap w-12">
                
              </th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone, index) => (
              <>
                <tr
                  key={milestone.id}
                  className={`
                    border-b border-table-border last:border-b-0
                    hover:bg-table-row-hover transition-colors
                    ${index % 2 === 0 ? 'bg-card' : 'bg-background/50'}
                  `}
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDateDisplay(milestone.start)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {milestone.name}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {DISCOVERY_MEETINGS[milestone.id] ? (
                      <button
                        onClick={() => toggleDiscovery(milestone.id)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {getNextMilestoneName(index)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        milestone.phase === 'Concept Phase'
                          ? 'phase-badge-concept'
                          : milestone.phase === 'Sketch Phase'
                          ? 'phase-badge-sketch'
                          : 'phase-badge-execution'
                      }
                    >
                      {milestone.phase}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() => onRemoveMilestone(milestone.id)}
                      className="btn-ghost text-muted-foreground hover:text-destructive p-1"
                      aria-label={`Remove ${milestone.name}`}
                      title="Remove milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {/* Discovery meetings expandable row */}
                {DISCOVERY_MEETINGS[milestone.id] && expandedDiscovery.has(milestone.id) && (
                  <tr key={`${milestone.id}-discovery`} className="border-b border-table-border bg-muted/20">
                    <td colSpan={7} className="px-4 py-3">
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
                                  : 'phase-badge-execution'
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
                      : 'phase-badge-execution'
                  }`}
                >
                  {milestone.phase}
                </span>
                <h3 className="font-medium text-foreground text-sm mt-1 truncate">{milestone.name}</h3>
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
                {milestone.overrideDays !== null && (
                  <button
                    onClick={() => onDaysChange(milestone.id, null)}
                    className="btn-ghost p-1"
                    aria-label={`Reset days for ${milestone.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
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
