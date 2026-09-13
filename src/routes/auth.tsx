import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to LearnFlow — AI Python Tutor" },
      {
        name: "description",
        content:
          "Sign in or create a LearnFlow account as a student or teacher to start learning Python with AI tutor agents.",
      },
      { property: "og:title", content: "Sign in to LearnFlow" },
      {
        property: "og:description",
        content: "Student and teacher access to the LearnFlow AI Python tutoring platform.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void authClient.getSession().then(({ data }) => {
      if (data?.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error, data } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Sign-in failed");
      return;
    }
    const signedInRole = (data?.user as { role?: string } | undefined)?.role;
    navigate({ to: signedInRole === "teacher" ? "/teacher" : "/dashboard" });
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: name || email.split("@")[0]!,
      // @ts-expect-error -- role is a Better-Auth additionalField, not in the base type
      role,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Sign-up failed");
      return;
    }
    toast.success("Account created");
    navigate({ to: role === "teacher" ? "/teacher" : "/dashboard" });
  }

  return (
    <div className="grid-backdrop flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <Link to="/" className="font-mono text-sm font-bold text-primary">
          learnflow<span className="text-muted-foreground">.py</span>
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Learn Python with agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Concepts, code review, debugging and exercises — one tutor team.
        </p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form className="space-y-4 pt-4" onSubmit={signIn}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form className="space-y-4 pt-4" onSubmit={signUp}>
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Email</Label>
                <Input
                  id="email2"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Password</Label>
                <Input
                  id="password2"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>I am a</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["student", "teacher"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                        role === option
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
