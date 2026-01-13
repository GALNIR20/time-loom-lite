import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { CalendarCheck, Clock, Target } from 'lucide-react';

interface SummaryCardsProps {
  totalDays: number;
  projectedEnd: string;
  sprint1Start: string | null;
  daysToSprint1: number | null;
  showDetailed: boolean;
}

export function SummaryCards({ 
  totalDays, 
  projectedEnd, 
  sprint1Start, 
  daysToSprint1, 
  showDetailed 
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <div className="summary-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label">Total Duration</span>
        </div>
        <div className="mt-2">
          <span className="summary-value text-xl sm:text-2xl">{formatDuration(totalDays, showDetailed)}</span>
          <span className="summary-subtext ml-2">days</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label text-xs">Start → Sprint 1</span>
        </div>
        <div className="mt-2">
          {daysToSprint1 !== null && sprint1Start ? (
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="summary-value text-xl sm:text-2xl">{formatDuration(daysToSprint1, showDetailed)}</span>
              <span className="summary-subtext text-xs sm:text-sm">days ({formatDateDisplay(sprint1Start)})</span>
            </div>
          ) : (
            <span className="summary-subtext">N/A</span>
          )}
        </div>
      </div>

      <div className="summary-card sm:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label">Projected End Date</span>
        </div>
        <div className="mt-2">
          <span className="summary-value text-xl sm:text-2xl">{formatDateDisplay(projectedEnd)}</span>
        </div>
      </div>
    </div>
  );
}
