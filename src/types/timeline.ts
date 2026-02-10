export type PhaseType = string;
export type PresetType = 'Big' | 'Medium' | 'BLITZ';

export interface PhaseConfig {
  id: string;
  name: string;
  color: string; // tailwind color key: 'blue', 'purple', 'green', 'orange', 'red', 'cyan', 'pink', 'yellow'
}

export interface MilestoneConfig {
  id: string;
  phase: PhaseType;
  name: string;
}

export interface MilestoneState extends MilestoneConfig {
  defaultDays: number;
  overrideDays: number | null;
  durationDays: number;
  start: string;
  end: string;
}

export interface TimelineExport {
  featureName?: string;
  projectStart: string;
  devStart: string;
  preset: PresetType;
  totalDays: number;
  projectedEnd: string;
  milestones: Array<{
    id: string;
    phase: string;
    name: string;
    durationDays: number;
    date: string;
  }>;
}
