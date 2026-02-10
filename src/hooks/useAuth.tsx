import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { RecordModel } from 'pocketbase';
import { pb } from '@/lib/pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(
    pb.authStore.isValid ? (pb.authStore.record as RecordModel) : null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate existing session by refreshing the token
    if (pb.authStore.isValid) {
      pb.collection('users').authRefresh()
        .then(() => {
          setUser(pb.authStore.record as RecordModel);
        })
        .catch(() => {
          pb.authStore.clear();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Listen for auth state changes (cross-tab sync, token refresh, etc.)
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record as RecordModel | null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      // Create the user record
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        role: 'user',
        is_approved: false,
      });

      // Auto-login after successful signup
      await pb.collection('users').authWithPassword(email, password);
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: new Error(message) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password);
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: new Error(message) };
    }
  };

  const signOut = async () => {
    pb.authStore.clear();
    // Clear selected game so game selection screen shows on next login
    localStorage.removeItem('predictor-selected-game');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
