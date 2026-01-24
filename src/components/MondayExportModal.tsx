import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MilestoneState } from '@/types/timeline';
import { toast } from 'sonner';

interface Board {
  id: string;
  name: string;
  groups: { id: string; title: string }[];
}

interface MondayExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: MilestoneState[];
  featureName: string;
}

export function MondayExportModal({ isOpen, onClose, milestones, featureName }: MondayExportModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ created: number; failed: number } | null>(null);

  // Fetch boards when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBoards();
    }
  }, [isOpen]);

  const fetchBoards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('get-monday-boards');
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setBoards(data.boards || []);
    } catch (err) {
      console.error('Error fetching boards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Monday.com boards');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedBoard) {
      toast.error('Please select a board');
      return;
    }

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const milestonesData = milestones.map(m => ({
        id: m.id,
        name: m.name,
        startDate: m.start,
        endDate: m.end,
        durationDays: m.durationDays
      }));

      const { data, error } = await supabase.functions.invoke('sync-to-monday', {
        body: {
          boardId: selectedBoard,
          groupId: selectedGroup || undefined,
          featureName: featureName || 'Project',
          milestones: milestonesData
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setSyncResult({ created: data.created, failed: data.failed });
      
      if (data.created > 0) {
        toast.success(`Successfully synced ${data.created} milestones to Monday.com`);
      }
      
      if (data.failed > 0) {
        toast.warning(`${data.failed} milestones failed to sync`);
      }
    } catch (err) {
      console.error('Error syncing to Monday:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync to Monday.com');
      toast.error('Failed to sync to Monday.com');
    } finally {
      setSyncing(false);
    }
  };

  const selectedBoardData = boards.find(b => b.id === selectedBoard);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative card-elevated w-full max-w-lg m-4 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#FF3D57"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#00CA72"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#FFCB00"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#00A0FF"/>
            </svg>
            <h3 className="font-semibold text-foreground">Export to Monday.com</h3>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-2"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading boards...</span>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {/* Success state */}
          {syncResult && !syncing && (
            <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-primary font-medium">Sync Complete</p>
                <p className="text-sm text-muted-foreground">
                  {syncResult.created} milestones created
                  {syncResult.failed > 0 && `, ${syncResult.failed} failed`}
                </p>
              </div>
            </div>
          )}

          {/* Board selection */}
          {!loading && boards.length > 0 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Board</label>
                <select
                  value={selectedBoard}
                  onChange={(e) => {
                    setSelectedBoard(e.target.value);
                    setSelectedGroup('');
                  }}
                  className="input-field w-full"
                >
                  <option value="">Choose a board...</option>
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group selection */}
              {selectedBoardData && selectedBoardData.groups.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Select Group <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Default group</option>
                    {selectedBoardData.groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Milestones to Export</label>
                <div className="bg-secondary rounded-lg p-3 max-h-40 overflow-y-auto">
                  <ul className="space-y-1 text-sm">
                    {milestones.map(m => (
                      <li key={m.id} className="flex items-center justify-between text-muted-foreground">
                        <span>{m.name}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span>{m.start}</span>
                          <span>{m.durationDays} days</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  {milestones.length} milestones will be created as items
                </p>
              </div>
            </>
          )}

          {/* No boards found */}
          {!loading && !error && boards.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No boards found in your Monday.com account.</p>
              <a 
                href="https://monday.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary text-sm inline-flex items-center gap-1 mt-2 hover:underline"
              >
                Create a board on Monday.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="btn-secondary">
            {syncResult ? 'Done' : 'Cancel'}
          </button>
          {syncResult && (
            <button 
              onClick={() => setSyncResult(null)} 
              className="btn-primary"
            >
              Sync Again
            </button>
          )}
          {!syncResult && (
            <button 
              onClick={handleSync} 
              className="btn-primary"
              disabled={!selectedBoard || syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                'Export to Monday'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
