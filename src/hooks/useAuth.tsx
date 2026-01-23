import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: null;
  session: null;
  loading: false;
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, session: null, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
