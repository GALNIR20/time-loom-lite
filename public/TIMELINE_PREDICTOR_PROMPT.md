# Timeline Predictor - Full Application Specification

## Overview

Build a **Timeline Predictor** web application for managing and comparing feature development timelines. The tool helps product teams plan projects through distinct phases (Concept, Sketch, Development) with configurable milestone durations based on project size presets.

---

## Core Concepts

### Phases
The project timeline consists of three main phases:
1. **Concept Phase** - Initial planning and ideation
2. **Sketch Phase** - Design and prototyping  
3. **Development** - Implementation (I-Phase + Sprints)

### Presets
Three project size presets with default milestone durations:

| Milestone | Big | Medium | BLITZ |
|-----------|-----|--------|-------|
| Brief | 14 days | 7 days | 5 days |
| Pre-Concept | 21 days | 17 days | 10 days |
| Concept | 42 days | 28 days | 14 days |
| Art Sketch | 7 days | 7 days | 3 days |
| Sketch | 14 days | 7 days | 7 days |
| I-Phase | 14 days | 7 days | 7 days |

### Default Milestones
```typescript
const DEFAULT_MILESTONES = [
  { id: 'brief', phase: 'Concept Phase', name: 'Brief' },
  { id: 'pre-concept', phase: 'Concept Phase', name: 'Pre-Concept' },
  { id: 'concept', phase: 'Concept Phase', name: 'Concept' },
  { id: 'art-sketch', phase: 'Sketch Phase', name: 'Art Sketch' },
  { id: 'sketch', phase: 'Sketch Phase', name: 'Sketch' },
  { id: 'i-phase', phase: 'Development', name: 'I-Phase' },
];
```

---

## Data Structures

### Types

```typescript
type PhaseType = 'Concept Phase' | 'Sketch Phase' | 'Development';
type PresetType = 'Big' | 'Medium' | 'BLITZ';

interface MilestoneConfig {
  id: string;
  phase: PhaseType;
  name: string;
}

interface MilestoneState extends MilestoneConfig {
  defaultDays: number;      // Days from preset
  overrideDays: number | null; // User override
  durationDays: number;     // Actual duration used
  start: string;            // ISO date
  end: string;              // ISO date
}

interface Project {
  id: string;
  feature_name: string;
  project_start: string;    // ISO date
  preset: PresetType;
  show_detailed: boolean;   // Show m/w/d breakdown
  overrides: Record<string, number | null>; // milestoneId -> days
  hidden_milestones: string[];  // IDs of removed milestones
  locked_dev_start: string | null; // Locked development start date
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface TimelineExport {
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
```

---

## Core Features

### 1. Project Management
- Create new projects with feature name
- Save/load projects from database
- Delete projects
- Auto-save changes (debounced 1 second)
- Real-time sync across tabs/devices

### 2. Timeline Calculation
Key algorithm: Milestones are sequential - each starts when the previous ends.

```typescript
function calculateTimeline(configs, overrides, projectStart, preset) {
  let currentDate = parseISO(projectStart);
  
  return configs.map(config => {
    const overrideDays = overrides[config.id] ?? null;
    const defaultDays = PRESET_CONFIGS[preset][config.id] ?? 0;
    const durationDays = overrideDays !== null ? overrideDays : defaultDays;
    
    const start = format(currentDate, 'yyyy-MM-dd');
    currentDate = addDays(currentDate, durationDays);
    const end = format(currentDate, 'yyyy-MM-dd');
    
    return { ...config, defaultDays, overrideDays, durationDays, start, end };
  });
}
```

### 3. Dev Start Date Locking
Users can lock the development start date (I-Phase). When locked:
- Changing preset recalculates project start to maintain dev start
- Formula: `projectStart = devStart - (sum of days before I-Phase)`

### 4. Milestone Customization
- Override duration for any milestone
- Remove/hide milestones (with undo)
- Merge milestones together
- Add development sprints (14 days each by default)

### 5. Sprint Management
- Add unlimited sprints after I-Phase
- Default sprint duration: 14 days
- Remove sprints (with undo)
- RFC (Release for Certification) is 14 days after last sprint

---

## UI Components

### 1. Controls Panel
- Feature name input (editable inline)
- Project start date picker
- Dev start date picker (with lock capability)
- Preset selector (Big/Medium/BLITZ)
- Toggle: Show detailed duration (months/weeks/days breakdown)

### 2. Summary Cards
Display key metrics:
- **Total Days** - Days until I-Phase starts
- **I-Phase Start** - Development start date
- **Dev Time** - Total development days
- **RFC Date** - Projected end (last sprint + 14 days)

### 3. Milestone Table
Interactive table showing:
| Phase | Milestone | Days | Start | End |
|-------|-----------|------|-------|-----|
Editable days with +/- controls or direct input.

### 4. Timeline View (Gantt Chart)
- Multiple view modes: Days, Weeks, Months, Quarters, Milestones
- Draggable bars to adjust duration
- "Today" indicator line
- Color-coded by milestone type:
  - Brief: specific color
  - Pre-Concept: specific color
  - Concept: specific color
  - Art Sketch: specific color
  - Sketch: specific color
  - I-Phase: specific color
  - Sprints: success/green color

### 5. Compare View
- Stack multiple projects vertically
- Aligned timeline grid
- Numbered milestone markers connected by lines
- Useful for comparing project timelines

### 6. Calendar View
- Monthly calendar showing all projects
- Colored dots on dates with milestones
- Side panel grouping milestones by month

---

## Export Features

### 1. JSON Export
Full project data in JSON format for backup/import.

### 2. Monday.com Integration
Sync milestones to Monday.com boards:
- Create group named after project
- Map dates to date columns
- Map phases/milestones to status columns
- Auto-create status labels

---

## User Authentication

- Email/password signup and login
- Protected routes requiring authentication
- User-specific project isolation (RLS)
- Admin role for viewing all projects

---

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL DEFAULT 'Untitled Project',
  project_start DATE NOT NULL DEFAULT CURRENT_DATE,
  preset TEXT NOT NULL DEFAULT 'Medium',
  show_detailed BOOLEAN NOT NULL DEFAULT false,
  overrides JSONB NOT NULL DEFAULT '{}',
  hidden_milestones JSONB NOT NULL DEFAULT '[]',
  locked_dev_start DATE,
  user_id UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can only access their own projects
```

### Project Activity Table
```sql
CREATE TABLE project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Key Behaviors

### Duration Formatting
```typescript
function formatDuration(days: number, showDetailed: boolean): string {
  if (!showDetailed) return `${days}`;
  
  const months = Math.floor(days / 30);
  const weeks = Math.floor((days % 30) / 7);
  const remainingDays = days % 7;
  
  const parts = [];
  if (months > 0) parts.push(`${months}m`);
  if (weeks > 0) parts.push(`${weeks}w`);
  if (remainingDays > 0) parts.push(`${remainingDays}d`);
  
  return `${days} (${parts.join(' ')})`;
}
```

### RFC Calculation
RFC date = Last milestone end date + 14 days

### State Persistence
- Auto-save to database on any change (1s debounce)
- Real-time subscription for multi-device sync
- Offline detection with retry logic

---

## Design System

### Color Tokens (Milestone Colors)
- `milestone-brief`: Brief phase color
- `milestone-pre-concept`: Pre-Concept color
- `milestone-concept`: Concept color
- `milestone-art-sketch`: Art Sketch color
- `milestone-sketch`: Sketch color
- `milestone-i-phase`: I-Phase color
- `success`: Sprint color (green)

### Theme Support
- Light and dark mode
- System preference detection
- Persisted preference

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State**: React hooks, React Query
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Date Handling**: date-fns
- **Routing**: React Router v6

---

## Implementation Notes

1. **Sequential Timeline**: Each milestone starts immediately after the previous ends
2. **Preset as Base**: Presets provide default values; overrides take precedence
3. **Locked Dev Start**: Maintains development date when changing presets
4. **Sprints are Dynamic**: Can add/remove sprints; not tied to presets
5. **Activity Logging**: Track project changes for audit trail
6. **Real-time Updates**: Subscribe to database changes for live sync

---

## Sample User Flow

1. User creates new project with feature name
2. Selects project start date
3. Chooses preset (Big/Medium/BLITZ)
4. Optionally locks dev start date for deadline-driven planning
5. Adjusts individual milestone durations as needed
6. Adds sprints for development phase
7. Views timeline in Gantt chart or table
8. Exports to JSON or syncs to Monday.com
9. Compares multiple projects in Compare View

---

## API Endpoints (Edge Functions)

### get-monday-boards
Fetches available Monday.com boards for the user.

### sync-to-monday
Syncs project milestones to a Monday.com board:
- Creates new group for project
- Maps milestone data to board columns
- Creates items with dates and status

### get-admin-users
Admin-only: Fetches all users with their roles and project counts.

---

This specification provides everything needed to rebuild the Timeline Predictor application. The core value is the flexible milestone system with preset defaults, user overrides, and locked development dates for deadline-driven planning.
