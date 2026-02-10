import { Plus, Minus } from 'lucide-react';
import { MilestoneConfig } from '@/types/timeline';
import { getSprintDuration } from '@/lib/timeline';

interface SprintManagerProps {
  milestones: MilestoneConfig[];
  onAddSprint: () => void;
  onRemoveSprint: () => void;
  readOnly?: boolean;
}

export function SprintManager({ milestones, onAddSprint, onRemoveSprint, readOnly = false }: SprintManagerProps) {
  // Count current sprints (milestones with id starting with 'sprint-')
  const sprintCount = milestones.filter((m) => m.id.startsWith('sprint-')).length;
  const sprintDays = getSprintDuration();
  const sprintWeeks = sprintDays / 7;
  
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sprint Management</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each sprint = {sprintWeeks} week{sprintWeeks !== 1 ? 's' : ''} ({sprintDays} days)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <span className="text-sm text-muted-foreground">Sprints:</span>
            <span className="text-lg font-bold text-foreground min-w-[2ch] text-center">{sprintCount}</span>
          </div>
          
          {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={onRemoveSprint}
                disabled={sprintCount <= 0}
                className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Remove sprint"
                title="Remove last sprint"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={onAddSprint}
                className="btn-primary p-2"
                aria-label="Add sprint"
                title="Add sprint"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
