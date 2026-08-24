import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { touchStreak } from "@/lib/learnflow-client";
import { BAND_LABEL, BAND_STROKE, BAND_TEXT, masteryBand } from "@/lib/mastery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — LearnFlow" },
      {
        name: "description",
        content: "Track module mastery, your streak and recent activity across the LearnFlow Python curriculum.",
      },
      { property: "og:title", content: "LearnFlow Student Dashboard" },
      { property: "og:description", content: "Module mastery rings, streaks and recent learning activity." },
    ],
  }),
  component: Dashboard,
});

export function MasteryRing({ value, size = 56 }: { value: number; size?: number }) {
  const band = masteryBand(value);
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className="stroke-border"
        strokeWidth={5}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className={BAND_STROKE[band]}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
      />
    </svg>
  );
}

function Dashboard() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) void touchStreak(user.id);
  }, [user]);

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [modules, topics, mastery, profile, events] = await Promise.all([
        supabase.from("modules").select("*").order("order_index"),
        supabase.from("topics").select("*").order("order_index"),
        supabase.from("mastery_scores").select("*").eq("user_id", user!.id),
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase
          .from("events")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      return {
        modules: modules.data ?? [],
        topics: topics.data ?? [],
        mastery: mastery.data ?? [],
        profile: profile.data,
        events: events.data ?? [],
      };
    },
  });

  if (!data) return <p className="text-sm text-muted-foreground">Loading your dashboard…</p>;

  const masteryByTopic = new Map(data.mastery.map((row) => [row.topic_id, row.mastery]));
  const moduleStats = data.modules.map((module) => {
    const topics = data.topics.filter((topic) => topic.module_id === module.id);
    const values = topics.map((topic) => masteryByTopic.get(topic.id) ?? 0);
    const avg = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;
    return { module, topics, avg };
  });
  const current = moduleStats.find((stat) => stat.avg < 100) ?? moduleStats[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Hi {data.profile?.display_name ?? "there"} 👋
          </h1>
          {current && (
            <p className="mt-1 text-sm text-muted-foreground">
              Current focus: <span className="text-foreground">{current.module.title}</span> —{" "}
              {current.avg}% complete
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
          <div className="font-mono text-2xl text-accent">{data.profile?.streak_days ?? 0}</div>
          <div className="text-xs text-muted-foreground">day streak</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moduleStats.map(({ module, topics, avg }) => {
          const band = masteryBand(avg);
          return (
            <Card key={module.id}>
              <CardHeader className="flex flex-row items-center gap-3">
                <MasteryRing value={avg} />
                <div>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <p className={`text-xs ${BAND_TEXT[band]}`}>
                    {avg}% · {BAND_LABEL[band]}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{module.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((topic) => (
                    <Badge key={topic.id} variant="secondary" className="font-normal">
                      {topic.title}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jump back in</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Link to="/tutor" className="rounded-md bg-primary px-3 py-2 text-primary-foreground">
              Ask the tutor
            </Link>
            <Link to="/code" className="rounded-md border border-border px-3 py-2">
              Open the editor
            </Link>
            <Link to="/quiz" className="rounded-md border border-border px-3 py-2">
              Take a quiz
            </Link>
            <Link to="/exercises" className="rounded-md border border-border px-3 py-2">
              Exercises
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 font-mono text-xs text-muted-foreground">
            {data.events.length === 0 && <p>No activity yet — say hello to the tutor.</p>}
            {data.events.map((event) => (
              <div key={event.id} className="flex justify-between gap-3">
                <span className="text-primary">{event.topic}</span>
                <span>{new Date(event.created_at).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
