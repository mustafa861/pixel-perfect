import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { generateExercises } from "@/lib/agents.functions";
import {
  getTeacherClassData,
  createExercisesBulk,
  resolveStruggleAlert,
} from "@/lib/learnflow.functions";
import { BAND_LABEL, BAND_TEXT, masteryBand } from "@/lib/mastery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher")({
  head: () => ({
    meta: [
      { title: "Class Overview — LearnFlow" },
      {
        name: "description",
        content:
          "Teacher view: class roster mastery, live struggle alerts and AI-generated Python exercises.",
      },
      { property: "og:title", content: "LearnFlow Class Overview" },
      {
        property: "og:description",
        content: "Roster mastery, struggle alerts and exercise generation for teachers.",
      },
    ],
  }),
  component: TeacherPage,
});

function TeacherPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateExercises);
  const fetchClass = useServerFn(getTeacherClassData);
  const bulkCreate = useServerFn(createExercisesBulk);
  const resolve = useServerFn(resolveStruggleAlert);
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["teacher-class"],
    queryFn: () => fetchClass(),
  });

  const nameById = new Map((data?.profiles ?? []).map((p) => [p.id, p.display_name]));

  const roster = (data?.profiles ?? []).map((profile) => {
    const scores = (data?.mastery ?? []).filter((m) => m.user_id === profile.id);
    const avg =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((sum, s) => sum + Number(s.mastery), 0) / scores.length);
    return { ...profile, avg, topics: scores.length };
  });

  async function createExercises() {
    if (!request.trim() || !user) return;
    setBusy(true);
    try {
      const result = await generate({ data: { request, count: 3 } });
      if (result.exercises.length === 0) {
        toast.error("The exercise agent returned nothing. Try rephrasing.");
        return;
      }
      await bulkCreate({ data: { exercises: result.exercises } });
      setRequest("");
      toast.success(`${result.exercises.length} exercises published to the class.`);
      void queryClient.invalidateQueries({ queryKey: ["teacher-class"] });
    } catch {
      toast.error("Could not generate exercises. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveAlert(id: string) {
    await resolve({ data: { id } });
    void queryClient.invalidateQueries({ queryKey: ["teacher-class"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Class overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roster mastery, live struggle alerts from the event stream, and exercise generation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roster.length === 0 && (
              <p className="text-sm text-muted-foreground">No students have signed up yet.</p>
            )}
            {roster.map((student) => {
              const band = masteryBand(student.avg);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{student.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.topics} topics · {student.streak_days} day streak
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${BAND_TEXT[band]}`}>{student.avg}%</p>
                    <p className="text-xs text-muted-foreground">{BAND_LABEL[band]}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Struggle alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.alerts.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No open alerts. The class is cruising.</p>
            )}
            {(data?.alerts ?? []).map((alert) => (
              <div key={alert.id} className="rounded-md border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {alert.trigger}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => void resolveAlert(alert.id)}>
                    Resolve
                  </Button>
                </div>
                <p className="mt-1 text-sm">{alert.detail}</p>
                <p className="text-xs text-muted-foreground">
                  {nameById.get(alert.student_id) ?? "Student"} ·{" "}
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate exercises</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              placeholder="e.g. three list-comprehension drills for beginners"
              className="min-w-[240px] flex-1"
            />
            <Button onClick={() => void createExercises()} disabled={busy || !request.trim()}>
              {busy ? "Generating…" : "Generate"}
            </Button>
          </div>
          <div className="space-y-1">
            {(data?.exercises ?? []).map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>{exercise.title}</span>
                <Badge variant="secondary" className="font-normal">
                  {exercise.difficulty}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
