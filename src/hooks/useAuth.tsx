import { createContext, useContext, useMemo, type ReactNode } from "react";
import { authClient, useSession } from "@/lib/auth-client";

export type Role = "student" | "teacher" | "admin";

type AuthState = {
  user: { id: string; email: string; name: string } | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();

  const value = useMemo<AuthState>(() => {
    const user = data?.user
      ? { id: data.user.id, email: data.user.email, name: data.user.name }
      : null;
    const role = (data?.user as { role?: Role } | undefined)?.role ?? (user ? "student" : null);
    return {
      user,
      role,
      loading: isPending,
      signOut: async () => {
        await authClient.signOut();
      },
    };
  }, [data, isPending]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
