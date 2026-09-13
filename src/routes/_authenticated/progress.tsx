import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { getProgressData } from "@/lib/learnflow.functions";
import { BAND_BG, BAND_LABEL, BAND_TEXT, MASTERY_WEIGHTS, masteryBand } from "@/lib/mastery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress & Mastery — LearnFlow" },
      {
        name: "description",
        content: "See mastery per Python topic, broken down into exercises, quizzes, code quality and consistency.",
      },
      { property: "og:title", content: "LearnFlow Progress & Mastery" },
      { property: "og:description", content: "Per-topic mastery breakdown across the Python curriculum." },
    ],
  }),
  component: ProgressPage,
});

function Bar({ label, value }: { label: string; value: number }) {
  const band = masteryBand(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${BAND_BG[band]}`} style={{ width: `${Math.max(2, value)}%` }} />
      </div>
    </div>
  );
}

function ProgressPage() {
  const { user } = useAuth();
  const fetchProgress = useServerFn(getProgressData);

  const { data } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchProgress(),
  });

  if (!data) return <p className="text-sm text-muted-foreground">Loading your progress…</p>;

  const byTopic = new Map(data.mastery.map((row) => [row.topic_id, row]));
  const overall = data.mastery.length
    ? Math.round(data.mastery.reduce((sum, row) => sum + row.mastery, 0) / data.mastery.length)
    : 0;
  const ranked = [...data.mastery].sort((a, b) => b.mastery - a.mastery);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const titleOf = (id: string) => data.topics.find((topic) => topic.id === id)?.title ?? "Unknown";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mastery = exercises {MASTERY_WEIGHTS.exercise * 100}% · quizzes {MASTERY_WEIGHTS.quiz * 100}% ·
          code quality {MASTERY_WEIGHTS.quality * 100}% · consistency {MASTERY_WEIGHTS.consistency * 100}%.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-mono text-3xl ${BAND_TEXT[masteryBand(overall)]}`}>{overall}%</p>
            <p className="text-xs text-muted-foreground">{BAND_LABEL[masteryBand(overall)]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strongest topic</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {strongest ? `${titleOf(strongest.topic_id)} · ${strongest.mastery}%` : "No data yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {weakest ? `${titleOf(weakest.topic_id)} · ${weakest.mastery}%` : "No data yet"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.topics.map((topic) => {
          const row = byTopic.get(topic.id);
          const value = row?.mastery ?? 0;
          return (
            <Card key={topic.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{topic.title}</CardTitle>
                <span className={`font-mono text-sm ${BAND_TEXT[masteryBand(value)]}`}>{value}%</span>
              </CardHeader>
              <CardContent className="space-y-2">
                <Bar label="Exercises" value={row?.exercise_pct ?? 0} />
                <Bar label="Quizzes" value={row?.quiz_pct ?? 0} />
                <Bar label="Code quality" value={row?.quality_pct ?? 0} />
                <Bar label="Consistency" value={row?.consistency_pct ?? 0} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent quizzes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          {data.quizzes.length === 0 && <p>No quiz attempts yet.</p>}
          {data.quizzes.map((quiz) => (
            <div key={quiz.id} className="flex justify-between gap-3">
              <span>{quiz.topic_id ? titleOf(quiz.topic_id) : "General"}</span>
              <span className="font-mono">
                {quiz.correct_count}/{quiz.total_count} · {quiz.score}%
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
