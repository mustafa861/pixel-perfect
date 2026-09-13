import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { gradeExercise } from "@/lib/agents.functions";
import { runPython } from "@/lib/python-runner";
import { getExercisesData, publishEvent, submitExerciseAttempt } from "@/lib/learnflow.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exercises")({
  head: () => ({
    meta: [
      { title: "Exercises — LearnFlow" },
      {
        name: "description",
        content: "Work through Python coding exercises, run them in the sandbox and get auto-graded feedback.",
      },
      { property: "og:title", content: "LearnFlow Python Exercises" },
      { property: "og:description", content: "Practice tasks with sandbox runs and AI grading." },
    ],
  }),
  component: ExercisesPage,
});

function ExercisesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const grade = useServerFn(gradeExercise);
  const fetchExercises = useServerFn(getExercisesData);
  const publish = useServerFn(publishEvent);
  const submitAttempt = useServerFn(submitExerciseAttempt);
  const [openId, setOpenId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ passed: boolean; score: number; feedback: string } | null>(
    null,
  );

  const { data } = useQuery({
    queryKey: ["exercises", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchExercises(),
  });

  const bestByExercise = new Map<string, number>();
  for (const attempt of data?.attempts ?? []) {
    const current = bestByExercise.get(attempt.exercise_id) ?? 0;
    if (attempt.score > current) bestByExercise.set(attempt.exercise_id, attempt.score);
  }

  async function submit(exerciseId: string, prompt: string, topicId: string | null) {
    if (!user) return;
    setBusy(true);
    setOutcome(null);
    try {
      const run = await runPython(code);
      const result = await grade({
        data: { prompt, code, stdout: run.stdout, stderr: run.stderr },
      });
      setOutcome(result);
      await submitAttempt({
        data: {
          exerciseId,
          topicId,
          code,
          passed: result.passed,
          score: result.score,
          feedback: result.feedback,
        },
      });
      void publish({
        data: { topic: "exercise.completed", payload: { exercise_id: exerciseId, score: result.score } },
      });
      void queryClient.invalidateQueries({ queryKey: ["exercises", user.id] });
    } catch {
      toast.error("Grading failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Exercises</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solve, run in the sandbox, and the exercise agent grades your work out of 100.
        </p>
      </div>

      {(data?.exercises.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">
          No exercises yet — your teacher can generate a set from the Class page.
        </p>
      )}

      <div className="space-y-4">
        {(data?.exercises ?? []).map((exercise) => {
          const open = openId === exercise.id;
          const best = bestByExercise.get(exercise.id);
          return (
            <Card key={exercise.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{exercise.title}</CardTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      {exercise.difficulty}
                    </Badge>
                    {best !== undefined && (
                      <span className="text-xs text-muted-foreground">Best {best}/100</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={open ? "secondary" : "default"}
                  onClick={() => {
                    setOutcome(null);
                    setOpenId(open ? null : exercise.id);
                    setCode(exercise.starter_code ?? "");
                  }}
                >
                  {open ? "Close" : "Start"}
                </Button>
              </CardHeader>
              {open && (
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm">{exercise.prompt}</p>
                  <p className="text-xs text-muted-foreground">Hint: {exercise.solution_hint}</p>
                  <Textarea
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    spellCheck={false}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <Button
                    onClick={() => void submit(exercise.id, exercise.prompt, exercise.topic_id)}
                    disabled={busy}
                  >
                    {busy ? "Grading…" : "Run & submit"}
                  </Button>
                  {outcome && (
                    <div className="rounded-md border border-border p-3 text-sm">
                      <p className="font-medium">
                        {outcome.passed ? "Passed" : "Not yet"} · {outcome.score}/100
                      </p>
                      <p className="mt-1 text-muted-foreground">{outcome.feedback}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
