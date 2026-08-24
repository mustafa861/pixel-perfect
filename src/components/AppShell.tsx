import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const studentNav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tutor", label: "Tutor" },
  { to: "/code", label: "Code" },
  { to: "/quiz", label: "Quiz" },
  { to: "/exercises", label: "Exercises" },
  { to: "/progress", label: "Progress" },
] as const;

const teacherNav = [
  { to: "/teacher", label: "Class" },
  { to: "/tutor", label: "Tutor" },
  { to: "/code", label: "Code" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nav = role === "teacher" ? teacherNav : studentNav;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="font-mono text-sm font-bold tracking-tight text-primary">
            learnflow<span className="text-muted-foreground">.py</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                activeProps={{ className: "bg-sidebar-accent text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/hackathon"
              className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}
            >
              Hackathon
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user?.email} · {role ?? "student"}
            </span>
            <Button size="sm" variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
