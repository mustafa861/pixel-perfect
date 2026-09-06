import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { reviewCode } from "@/lib/agents.functions";
import { runPython, type RunResult } from "@/lib/python-runner";
import { publishEvent, raiseStruggle, recomputeMastery } from "@/lib/learnflow-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/code")({
  head: () => ({
    meta: [
      { title: "Python Sandbox — LearnFlow" },
      {
        name: "description",
        content: "Write and run Python safely in the browser, then get an AI code review with a quality score.",
      },
      { property: "og:title", content: "LearnFlow Python Sandbox" },
      { property: "og:description", content: "Run Python in a sandbox and get instant AI review." },
    ],
  }),
  component: CodePage,
});

const STARTER = `# Try it out\nfor i in range(5):\n    print("hello", i)\n`;

function CodePage() {
  const { user } = useAuth();
  const review = useServerFn(reviewCode);
  const [code, setCode] = useState(STARTER);
  const [topicId, setTopicId] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [feedback, setFeedback] = useState<{ feedback: string; quality: number | null } | null>(null);
  const [running, setRunning] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const { data: topics } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => (await supabase.from("topics").select("*").order("order_index")).data ?? [],
  });
  const topicTitle = topics?.find((t) => t.id === topicId)?.title;

  async function run() {
    if (!user) return;
    setRunning(true);
    setFeedback(null);
    void publishEvent(user.id, "code.submitted", { topic_id: topicId || null });
    const output = await runPython(code);
    setResult(output);
    setRunning(false);

    await supabase.from("code_submissions").insert({
      user_id: user.id,
      topic_id: topicId || null,
      code,
      stdout: output.stdout,
      stderr: output.stderr,
      success: output.success,
      error_type: output.errorType,
    });
    void publishEvent(user.id, "code.executed", {
      success: output.success,
      error_type: output.errorType,
      topic_id: topicId || null,
    });
    if (!output.success) {
      void raiseStruggle(
        user.id,
        "error",
        `${output.errorType ?? "Error"}: ${output.stderr.slice(0, 200)}`,
        topicId || null,
      );
    }
  }

  async function getReview() {
    if (!user) return;
    setReviewing(true);
    try {
      const res = await review({
        data: {
          code,
          stdout: result?.stdout ?? "",
          stderr: result?.stderr ?? "",
          ...(topicTitle ? { topicTitle } : {}),
        },
      });
      setFeedback(res);
      if (res.quality !== null) {
        await supabase
          .from("code_submissions")
          .insert({
            user_id: user.id,
            topic_id: topicId || null,
            code,
            stdout: result?.stdout ?? "",
            stderr: result?.stderr ?? "",
            success: result?.success ?? true,
            error_type: result?.errorType ?? null,
            quality_score: res.quality,
          });
        if (topicId) await recomputeMastery(user.id, topicId);
      }
      void publishEvent(user.id, "code.reviewed", {
        quality: res.quality,
        topic_id: topicId || null,
      });
    } catch {
      toast.error("The review agent is unavailable right now.");
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Python sandbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Runs in your browser with a 5 second limit and no network access.
          </p>
        </div>
        <select
          value={topicId}
          onChange={(event) => setTopicId(event.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">No topic selected</option>
          {(topics ?? []).map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">editor.py</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void run()} disabled={running}>
                {running ? "Running…" : "Run"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void getReview()} disabled={reviewing}>
                {reviewing ? "Reviewing…" : "AI review"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
              className="min-h-[340px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs">
                {result ? (result.stdout || "(no output)") : "Run your code to see output."}
                {result?.stderr && (
                  <span className="text-destructive">{"\n" + result.stderr}</span>
                )}
              </pre>
            </CardContent>
          </Card>

          {feedback && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Code review{feedback.quality !== null && ` · ${feedback.quality}/100`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{feedback.feedback}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
