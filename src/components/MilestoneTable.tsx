import { MilestoneState } from '@/types/timeline';
import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { X } from 'lucide-react';

interface MilestoneTableProps {
  milestones: MilestoneState[];
  showWeeks: boolean;
  onOverrideChange: (id: string, value: number | null) => void;
}

export function MilestoneTable({
  milestones,
  showWeeks,
  onOverrideChange,
}: MilestoneTableProps) {
  const handleOverrideInput = (id: string, value: string) => {
    if (value === '') {
      onOverrideChange(id, null);
      return;
    }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onOverrideChange(id, parsed);
    }
  };

  return (
    <div className="card-elevated overflow-hidden">
      <div className="table-container">
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
                Min–Max
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Override
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Duration
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                Start Date
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                End Date
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
                      milestone.phase === 'PLC'
                        ? 'phase-badge-plc'
                        : 'phase-badge-delivery'
                    }
                  >
                    {milestone.phase}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {milestone.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {milestone.minDays}–{milestone.maxDays} days
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={milestone.overrideDays ?? ''}
                      onChange={(e) =>
                        handleOverrideInput(milestone.id, e.target.value)
                      }
                      placeholder="—"
                      className="input-field w-20 text-center"
                      aria-label={`Override days for ${milestone.name}`}
                    />
                    {milestone.overrideDays !== null && (
                      <button
                        onClick={() => onOverrideChange(milestone.id, null)}
                        className="btn-ghost"
                        aria-label={`Clear override for ${milestone.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {formatDuration(milestone.durationDays, showWeeks)}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDateDisplay(milestone.start)}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDateDisplay(milestone.end)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
