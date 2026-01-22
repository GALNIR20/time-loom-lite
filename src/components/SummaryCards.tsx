import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { CalendarCheck, Clock, Target, Rocket, PlayCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface SummaryCardsProps {
  totalDays: number;
  projectedEnd: string;
  iPhaseStart: string | null;
  daysToIPhase: number | null;
  showDetailed: boolean;
  devDays: number;
  projectStart: string;
}

export function SummaryCards({ 
  totalDays, 
  projectedEnd, 
  iPhaseStart, 
  daysToIPhase, 
  showDetailed,
  devDays,
  projectStart
}: SummaryCardsProps) {
  const daysToStart = differenceInDays(parseISO(projectStart), new Date());
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
      <div className="summary-card group hover:border-primary/20 transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
            <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          </div>
          <span className="summary-label">Total Duration</span>
        </div>
        <div className="mt-3 sm:mt-4">
          <span className="summary-value text-lg sm:text-2xl">{formatDuration(totalDays, showDetailed)}</span>
          <span className="summary-subtext ml-1.5 sm:ml-2">days</span>
        </div>
      </div>

      <div className="summary-card group hover:border-primary/20 transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
            <Target className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          </div>
          <span className="summary-label">To I-Phase</span>
        </div>
        <div className="mt-3 sm:mt-4">
          {daysToIPhase !== null && iPhaseStart ? (
            <div className="flex flex-col">
              <span className="summary-value text-lg sm:text-2xl">{formatDuration(daysToIPhase, showDetailed)}</span>
              <span className="summary-subtext text-[10px] sm:text-xs mt-0.5">days ({formatDateDisplay(iPhaseStart)})</span>
            </div>
          ) : (
            <span className="summary-subtext">N/A</span>
          )}
        </div>
      </div>

      <div className="summary-card group hover:border-primary/20 transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
            <Rocket className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          </div>
          <span className="summary-label">Dev Time</span>
        </div>
        <div className="mt-3 sm:mt-4">
          <span className="summary-value text-lg sm:text-2xl">{formatDuration(devDays, showDetailed)}</span>
          <span className="summary-subtext ml-1.5 sm:ml-2">days</span>
        </div>
      </div>

      <div className="summary-card group hover:border-primary/20 transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
            <PlayCircle className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          </div>
          <span className="summary-label">Days to Start</span>
        </div>
        <div className="mt-3 sm:mt-4">
          <span className="summary-value text-lg sm:text-2xl">{daysToStart}</span>
          <span className="summary-subtext ml-1.5 sm:ml-2">days</span>
        </div>
      </div>

      <div className="summary-card group hover:border-primary/20 transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
            <CalendarCheck className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          </div>
          <span className="summary-label">RFC Estimation</span>
        </div>
        <div className="mt-3 sm:mt-4">
          <span className="summary-value text-lg sm:text-2xl">{formatDateDisplay(projectedEnd)}</span>
        </div>
      </div>
    </div>
  );
}
