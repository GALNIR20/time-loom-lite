import { MilestoneConfig, MilestoneState, PresetType } from '@/types/timeline';
import { format, addDays, parseISO } from 'date-fns';

// Use 'Big' | 'Medium' | 'BLITZ' as keys (non-null presets)
type NonNullPreset = Exclude<PresetType, null>;

export const PRESET_CONFIGS: Record<NonNullPreset, Record<string, number>> = {
  Big: {
    'brief': 14,
    'pre-concept': 21,
    'concept': 42,
    'art-sketch': 7,
    'sketch': 14,
    'i-phase': 14,
    'sprint-1': 0,
  },
  Medium: {
    'brief': 7,
    'pre-concept': 17,
    'concept': 28,
    'art-sketch': 7,
    'sketch': 7,
    'i-phase': 7,
    'sprint-1': 0,
  },
  BLITZ: {
    'brief': 5,
    'pre-concept': 10,
    'concept': 14,
    'art-sketch': 3,
    'sketch': 7,
    'i-phase': 7,
    'sprint-1': 0,
  },
};

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { id: 'brief', phase: 'Concept Phase', name: 'Brief' },
  { id: 'pre-concept', phase: 'Concept Phase', name: 'Pre-Concept' },
  { id: 'concept', phase: 'Concept Phase', name: 'Concept' },
  { id: 'art-sketch', phase: 'Sketch Phase', name: 'Art Sketch' },
  { id: 'sketch', phase: 'Sketch Phase', name: 'Sketch' },
  { id: 'i-phase', phase: 'Development', name: 'I-Phase' },
];

export const SPRINT_DURATION_DAYS = 14;

export function createSprintMilestone(sprintNumber: number): MilestoneConfig {
  return {
    id: `sprint-${sprintNumber}`,
    phase: 'Development',
    name: `Sprint ${sprintNumber}`,
  };
}

export function getPresetDuration(
  milestoneId: string,
  preset: PresetType,
  overrideDays: number | null
): number {
  if (overrideDays !== null && overrideDays >= 0) {
    return overrideDays;
  }
  if (!preset) return 0;
  return PRESET_CONFIGS[preset][milestoneId] ?? 0;
}

export function calculateTimeline(
  configs: MilestoneConfig[],
  overrides: Record<string, number | null>,
  projectStart: string,
  preset: PresetType
): MilestoneState[] {
  // Return empty if no project start or preset
  if (!projectStart || !preset) return [];
  
  const startDate = parseISO(projectStart);
  let currentDate = startDate;

  return configs.map((config) => {
    const overrideDays = overrides[config.id] ?? null;
    const defaultDays = PRESET_CONFIGS[preset][config.id] ?? 0;
    
    const durationDays = getPresetDuration(
      config.id,
      preset,
      overrideDays
    );

    const start = format(currentDate, 'yyyy-MM-dd');
    const endDate = addDays(currentDate, durationDays);
    const end = format(endDate, 'yyyy-MM-dd');

    currentDate = endDate;

    return {
      ...config,
      defaultDays,
      overrideDays,
      durationDays,
      start,
      end,
    };
  });
}

export function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '—';
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
