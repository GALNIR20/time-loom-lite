import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileJson, Check, AlertCircle } from 'lucide-react';
import { useProjects, DbProject } from '@/hooks/useProjects';
import { PresetType } from '@/types/timeline';
import { toast } from 'sonner';

interface ExportedProject {
  feature_name: string;
  project_start: string;
  preset: string;
  show_detailed: boolean;
  overrides: Record<string, number | null>;
  hidden_milestones: string[];
  locked_dev_start: string | null;
  exported_at: string;
}

interface ExportData {
  version: string;
  exported_at: string;
  projects: ExportedProject[];
}

export default function SettingsPage() {
  const { projects, createProject } = useProjects();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleExportAll = () => {
    if (projects.length === 0) {
      toast.error('No projects to export');
      return;
    }

    const exportData: ExportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      projects: projects.map(p => ({
        feature_name: p.feature_name,
        project_start: p.project_start,
        preset: p.preset,
        show_detailed: p.show_detailed,
        overrides: p.overrides,
        hidden_milestones: p.hidden_milestones,
        locked_dev_start: p.locked_dev_start,
        exported_at: new Date().toISOString(),
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictor-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${projects.length} project(s)`);
  };

  const handleExportSingle = (project: DbProject) => {
    const exportData: ExportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      projects: [{
        feature_name: project.feature_name,
        project_start: project.project_start,
        preset: project.preset,
        show_detailed: project.show_detailed,
        overrides: project.overrides,
        hidden_milestones: project.hidden_milestones,
        locked_dev_start: project.locked_dev_start,
        exported_at: new Date().toISOString(),
      }]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.feature_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported "${project.feature_name}"`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setImportMessage('');

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      // Validate structure
      if (!data.version || !data.projects || !Array.isArray(data.projects)) {
        throw new Error('Invalid file format. Expected Predictor export file.');
      }

      let imported = 0;
      let skipped = 0;

      for (const project of data.projects) {
        // Validate required fields
        if (!project.feature_name || !project.project_start || !project.preset) {
          skipped++;
          continue;
        }

        // Create project
        const result = await createProject({
          feature_name: project.feature_name,
          project_start: project.project_start,
          preset: project.preset as PresetType,
          show_detailed: project.show_detailed ?? true,
          overrides: project.overrides || {},
          hidden_milestones: project.hidden_milestones || [],
          locked_dev_start: project.locked_dev_start || null,
        });

        if (result) {
          imported++;
        } else {
          skipped++;
        }
      }

      if (imported > 0) {
        setImportStatus('success');
        setImportMessage(`Successfully imported ${imported} project(s)${skipped > 0 ? `, ${skipped} skipped` : ''}`);
        toast.success(`Imported ${imported} project(s)`);
      } else {
        setImportStatus('error');
        setImportMessage('No projects were imported. Check file format.');
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Failed to import file');
      toast.error('Failed to import projects');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 p-8 bg-muted/30 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

        <Tabs defaultValue="data" className="space-y-6">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  Import & Export
                </CardTitle>
                <CardDescription>Backup your projects or share them with others</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Export Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Export Projects</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Download your projects as a JSON file for backup or sharing
                    </p>
                    <Button onClick={handleExportAll} className="gap-2">
                      <Download className="w-4 h-4" />
                      Export All Projects ({projects.length})
                    </Button>
                  </div>

                  {/* Individual Project Export */}
                  {projects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or export individual projects:</Label>
                      <div className="flex flex-wrap gap-2">
                        {projects.slice(0, 10).map((project) => (
                          <Button
                            key={project.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingle(project)}
                            className="gap-1.5 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            {project.feature_name}
                          </Button>
                        ))}
                        {projects.length > 10 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{projects.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Import Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Import Projects</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Load projects from a previously exported JSON file
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button onClick={handleImportClick} variant="outline" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Import from JSON
                    </Button>
                  </div>

                  {/* Import Status */}
                  {importStatus !== 'idle' && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      importStatus === 'success' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {importStatus === 'success' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{importMessage}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Project Defaults</CardTitle>
                <CardDescription>Configure default settings for new projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultPreset">Default Preset</Label>
                  <Input id="defaultPreset" defaultValue="Big" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-save Projects</Label>
                    <p className="text-sm text-muted-foreground">Automatically save project changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive project updates via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sprint Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded about upcoming sprints</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Milestone Alerts</Label>
                    <p className="text-sm text-muted-foreground">Notifications for milestone deadlines</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Use dark theme</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact View</Label>
                    <p className="text-sm text-muted-foreground">Show more content in less space</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
