import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { CalendarCheck, Clock } from 'lucide-react';

interface SummaryCardsProps {
  totalDays: number;
  projectedEnd: string;
  showWeeks: boolean;
}

export function SummaryCards({ totalDays, projectedEnd, showWeeks }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="summary-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label">Total Duration</span>
        </div>
        <div className="mt-2">
          <span className="summary-value">{formatDuration(totalDays, showWeeks)}</span>
          <span className="summary-subtext ml-2">days</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label">Projected End Date</span>
        </div>
        <div className="mt-2">
          <span className="summary-value">{formatDateDisplay(projectedEnd)}</span>
        </div>
      </div>
    </div>
  );
}
