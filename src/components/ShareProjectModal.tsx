import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, Users, Crown } from 'lucide-react';
import { useProjects, ProjectMember, DbProject } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');

interface ShareProjectModalProps {
  project: DbProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareProjectModal({ project, isOpen, onClose }: ShareProjectModalProps) {
  const { user } = useAuth();
  const { getProjectMembers, shareProject, removeMember } = useProjects();
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project) {
      loadMembers();
    }
  }, [isOpen, project]);

  const loadMembers = async () => {
    if (!project) return;
    setLoading(true);
    const data = await getProjectMembers(project.id);
    setMembers(data);
    setLoading(false);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!project) return;

    setSharing(true);
    const success = await shareProject(project.id, email);
    setSharing(false);

    if (success) {
      setEmail('');
      loadMembers();
    }
  };

  const handleRemove = async (membershipId: string) => {
    const success = await removeMember(membershipId);
    if (success) {
      loadMembers();
    }
  };

  const isOwner = project?.owner_id === user?.id;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            {project?.feature_name || 'Untitled Project'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share form - only for owners */}
          {isOwner && (
            <form onSubmit={handleShare} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="share-email">Invite by email</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={sharing}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sharing || !email.trim()}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    {sharing ? 'Sharing...' : 'Share'}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </form>
          )}

          {/* Members list */}
          <div className="space-y-2">
            <Label>People with access</Label>
            <div className="border rounded-lg divide-y">
              {/* Owner */}
              <div className="flex items-center justify-between p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    {user?.id === project?.owner_id ? 'You (Owner)' : 'Owner'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Full access</span>
              </div>

              {/* Shared members */}
              {loading ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Loading members...
                </div>
              ) : members.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No one else has access yet
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{member.email}</span>
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {!isOwner && (
            <p className="text-xs text-muted-foreground text-center">
              Only the project owner can manage sharing settings
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
