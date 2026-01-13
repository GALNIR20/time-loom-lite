import { MilestoneState } from '@/types/timeline';
import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { X, ArrowRight } from 'lucide-react';

interface MilestoneTableProps {
  milestones: MilestoneState[];
  showDetailed: boolean;
  onDaysChange: (id: string, value: number | null) => void;
}

export function MilestoneTable({
  milestones,
  showDetailed,
  onDaysChange,
}: MilestoneTableProps) {
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

  return (
    <div className="card-elevated overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-table-header border-b border-table-border">
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Phase
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Milestone
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Days
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Next Milestone
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Duration
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone, index) => (
              <tr
                key={milestone.id}
                className={`
                  border-b border-table-border last:border-b-0
                  hover:bg-table-row-hover transition-colors
                  ${index % 2 === 0 ? 'bg-card' : 'bg-background/50'}
                `}
              >
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
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {milestone.name}
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
                  {index < milestones.length - 1 ? milestones[index + 1].name : '—'}
                </td>
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {formatDuration(milestone.durationDays, showDetailed)}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDateDisplay(milestone.start)}
                </td>
              </tr>
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
              <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatDateDisplay(milestone.start)}
              </span>
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
    </div>
  );
}
