export type PhaseType = 'Concept Phase' | 'Sketch Phase' | 'Development';
export type PresetType = 'Big' | 'Medium' | 'BLITZ' | null;

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
