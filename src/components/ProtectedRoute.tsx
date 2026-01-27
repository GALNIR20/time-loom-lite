import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    async function checkApprovalStatus() {
      if (!user) {
        setCheckingApproval(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('is_approved')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking approval status:', error);
          setIsApproved(false);
        } else {
          setIsApproved(data?.is_approved ?? false);
        }
      } catch (error) {
        console.error('Error checking approval status:', error);
        setIsApproved(false);
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

  return <>{children}</>;
}
