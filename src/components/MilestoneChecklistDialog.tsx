import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Package } from 'lucide-react';
import { getChecklistForMilestone, getItemIdsForMilestone, getAllChecklistItemIds, type ChecklistSection } from '@/hooks/useChecklistSettings';

// Re-export helpers so existing imports keep working
export { getAllChecklistItemIds, getItemIdsForMilestone };

// Icon color mapping
const ICON_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-500' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  green:   { bg: 'bg-green-500/10',   text: 'text-green-500' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-500' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-500' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-500' },
  pink:    { bg: 'bg-pink-500/10',    text: 'text-pink-500' },
  yellow:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-500' },
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-500' },
};

function getIconColors(color: string) {
  return ICON_COLOR_MAP[color] || ICON_COLOR_MAP.blue;
}

interface MilestoneChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneName: string;
  milestoneId: string;
  checkedItems: string[];
  onToggleItem: (milestoneId: string, itemId: string) => void;
  readOnly?: boolean;
}

function ChecklistSectionBlock({
  section,
  milestoneId,
  checkedItems,
  onToggleItem,
  readOnly,
}: {
  section: ChecklistSection;
  milestoneId: string;
  checkedItems: string[];
  onToggleItem: (milestoneId: string, itemId: string) => void;
  readOnly: boolean;
}) {
  const colors = getIconColors(section.color);
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-md ${colors.bg} flex items-center justify-center`}>
          <Package className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
      </div>
      <div className="space-y-2 ml-8">
        {section.items.map((item) => {
          const isChecked = checkedItems.includes(item.id);
          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 py-1.5 px-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                readOnly ? 'pointer-events-none' : ''
              }`}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggleItem(milestoneId, item.id)}
                disabled={readOnly}
              />
              <span
                className={`text-sm transition-opacity ${
                  isChecked ? 'text-foreground' : 'text-muted-foreground/50'
                }`}
              >
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function MilestoneChecklistDialog({
  open,
  onOpenChange,
  milestoneName,
  milestoneId,
  checkedItems,
  onToggleItem,
  readOnly = false,
}: MilestoneChecklistDialogProps) {
  // Read dynamic checklist sections for THIS specific milestone
  const sections = milestoneId ? getChecklistForMilestone(milestoneId) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{milestoneName}</DialogTitle>
          <DialogDescription>
            Track deliverables for this milestone
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {sections.map((section, idx) => (
            <div key={section.id}>
              {idx > 0 && <div className="border-t border-border mb-5" />}
              <ChecklistSectionBlock
                section={section}
                milestoneId={milestoneId}
                checkedItems={checkedItems}
                onToggleItem={onToggleItem}
                readOnly={readOnly}
              />
            </div>
          ))}
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No deliverables configured for this milestone. Add them in Settings → Deliverables.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
