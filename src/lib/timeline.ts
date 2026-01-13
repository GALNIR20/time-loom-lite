import { MilestoneConfig, MilestoneState } from '@/types/timeline';
import { format, addDays, parseISO } from 'date-fns';

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { id: 'brief', phase: 'Concept Phase', name: 'Brief', defaultMinDays: 7, defaultMaxDays: 14 },
  { id: 'pre-concept', phase: 'Concept Phase', name: 'Pre-Concept', defaultMinDays: 21, defaultMaxDays: 21 },
  { id: 'concept', phase: 'Concept Phase', name: 'Concept', defaultMinDays: 42, defaultMaxDays: 42 },
  { id: 'art-sketch', phase: 'Sketch Phase', name: 'Art Sketch', defaultMinDays: 7, defaultMaxDays: 7 },
  { id: 'sketch', phase: 'Sketch Phase', name: 'Sketch', defaultMinDays: 14, defaultMaxDays: 14 },
  { id: 'i-phase', phase: 'Execution Phase', name: 'I-Phase', defaultMinDays: 7, defaultMaxDays: 7 },
  { id: 'sprint-1', phase: 'Execution Phase', name: 'Sprint 1', defaultMinDays: 14, defaultMaxDays: 14 },
];

export function calculateDuration(
  minDays: number,
  maxDays: number,
  speed: number,
  overrideDays: number | null
): number {
  if (overrideDays !== null && overrideDays >= 0) {
    return overrideDays;
  }
  const midpoint = (minDays + maxDays) / 2;
  return Math.round(midpoint * speed);
}

export function calculateTimeline(
  configs: MilestoneConfig[],
  overrides: Record<string, number | null>,
  projectStart: string,
  speed: number
): MilestoneState[] {
  const startDate = parseISO(projectStart);
  let currentDate = startDate;

  return configs.map((config) => {
    const overrideDays = overrides[config.id] ?? null;
    const minDays = config.defaultMinDays;
    const maxDays = config.defaultMaxDays;
    
    const durationDays = calculateDuration(
      minDays,
      maxDays,
      speed,
      overrideDays
    );

    const start = format(currentDate, 'yyyy-MM-dd');
    const endDate = addDays(currentDate, durationDays);
    const end = format(endDate, 'yyyy-MM-dd');

    currentDate = endDate;

    return {
      ...config,
      minDays,
      maxDays,
      overrideDays,
      durationDays,
      start,
      end,
    };
  });
}

export function formatDateDisplay(isoDate: string): string {
  const date = parseISO(isoDate);
  return format(date, 'MMM d, yyyy');
}

export function daysToMonthsWeeksDays(days: number): string {
  const months = Math.floor(days / 30);
  const remainingAfterMonths = days % 30;
  const weeks = Math.floor(remainingAfterMonths / 7);
  const remainingDays = remainingAfterMonths % 7;
  
  const parts: string[] = [];
  if (months > 0) parts.push(`${months}m`);
  if (weeks > 0) parts.push(`${weeks}w`);
  if (remainingDays > 0) parts.push(`${remainingDays}d`);
  
  return parts.length > 0 ? parts.join(' ') : '';
}

export function formatDuration(days: number, showDetailed: boolean): string {
  if (!showDetailed) return `${days}`;
  const detailedStr = daysToMonthsWeeksDays(days);
  return detailedStr ? `${days} (${detailedStr})` : `${days}`;
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
