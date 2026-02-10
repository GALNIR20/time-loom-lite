import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { pb } from '@/lib/pocketbase';
import { Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipGameCheck?: boolean;
}

export function ProtectedRoute({ children, skipGameCheck = false }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { selectedGame, clearGame } = useGame();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [allowedGames, setAllowedGames] = useState<string[] | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    async function checkApprovalStatus() {
      if (!user) {
        setCheckingApproval(false);
        return;
      }

      try {
        // Fetch fresh user data to check approval status and allowed games
        const record = await pb.collection('users').getOne(user.id, { requestKey: 'check-approval' });
        setIsApproved((record.is_approved as boolean) ?? false);
        setAllowedGames((record.allowed_games as string[]) || []);
      } catch (error) {
        console.error('Error checking approval status:', error);
        setIsApproved(false);
        setAllowedGames([]);
      } finally {
        setCheckingApproval(false);
      }
    }

    if (user) {
      checkApprovalStatus();
    } else {
      setCheckingApproval(false);
    }
  }, [user]);

  // If non-admin user has selected a game that is no longer in their allowed list, clear it
  useEffect(() => {
    if (
      user?.role !== 'admin' &&
      allowedGames !== null &&
      selectedGame &&
      allowedGames.length > 0 &&
      !allowedGames.includes(selectedGame)
    ) {
      clearGame();
    }
  }, [allowedGames, selectedGame, clearGame, user?.role]);

  if (loading || checkingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isApproved === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle>Account Pending Approval</CardTitle>
            <CardDescription>
              Your account is waiting for administrator approval. You'll be able to access the application once an admin approves your registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p className="mt-1">
                <strong>Status:</strong> <span className="text-amber-600 dark:text-amber-400">Pending</span>
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admins bypass game restrictions
  const isAdmin = user?.role === 'admin';

  // If non-admin user selected a game they don't have access to, redirect to game select
  if (
    !skipGameCheck &&
    !isAdmin &&
    selectedGame &&
    allowedGames !== null &&
    allowedGames.length > 0 &&
    !allowedGames.includes(selectedGame)
  ) {
    return <Navigate to="/select-game" replace />;
  }

  // Redirect to game selection if no game is selected (unless we're on the game select page itself)
  if (!skipGameCheck && !selectedGame) {
    return <Navigate to="/select-game" replace />;
  }

  return <>{children}</>;
}
