import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateQuiz } from "@/lib/agents.functions";
import { publishEvent, raiseStruggle, recomputeMastery } from "@/lib/learnflow-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({
    meta: [
      { title: "Adaptive Quiz — LearnFlow" },
      {
        name: "description",
        content: "Generate a fresh multiple-choice Python quiz for any topic and see your score feed into mastery.",
      },
      { property: "og:title", content: "LearnFlow Adaptive Python Quiz" },
      { property: "og:description", content: "AI-generated multiple-choice quizzes per topic." },
    ],
  }),
  component: QuizPage,
});

type Question = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

function QuizPage() {
  const { user } = useAuth();
  const makeQuiz = useServerFn(generateQuiz);
  const [topicId, setTopicId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: topics } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => (await supabase.from("topics").select("*").order("order_index")).data ?? [],
  });
  const topicTitle = topics?.find((t) => t.id === topicId)?.title;

  async function start() {
    if (!topicTitle) {
      toast.error("Pick a topic first.");
      return;
    }
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    try {
      const result = await makeQuiz({ data: { topicTitle, count: 5 } });
      setQuestions(result.questions as Question[]);
      if (user) void publishEvent(user.id, "learning.session.started", { topic_id: topicId });
    } catch {
      toast.error("Could not build a quiz right now.");
    } finally {
      setLoading(false);
    }
  }

  const correctCount = questions.reduce(
    (sum, question, index) => sum + (answers[index] === question.correct_index ? 1 : 0),
    0,
  );

  async function submit() {
    if (!user || questions.length === 0) return;
    setSubmitted(true);
    const score = Math.round((correctCount / questions.length) * 100);
    await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      topic_id: topicId || null,
      questions: questions as never,
      answers: answers as never,
      correct_count: correctCount,
      total_count: questions.length,
      score,
    });
    void publishEvent(user.id, "learning.quiz.completed", { score, topic_id: topicId || null });
    if (score < 50) {
      void raiseStruggle(user.id, "quiz", `Scored ${score}% on ${topicTitle}`, topicId || null);
    }
    if (topicId) await recomputeMastery(user.id, topicId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Quiz</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Five fresh questions, generated for the topic you choose.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={topicId}
            onChange={(event) => setTopicId(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Pick a topic</option>
            {(topics ?? []).map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
          <Button onClick={() => void start()} disabled={loading}>
            {loading ? "Building…" : "New quiz"}
          </Button>
        </div>
      </div>

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground">Choose a topic and start a quiz.</p>
      )}

      <div className="space-y-4">
        {questions.map((question, qIndex) => (
          <Card key={qIndex}>
            <CardHeader>
              <CardTitle className="text-base">
                {qIndex + 1}. {question.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {question.options.map((option, oIndex) => {
                const picked = answers[qIndex] === oIndex;
                const isCorrect = question.correct_index === oIndex;
                const tone = submitted
                  ? isCorrect
                    ? "border-mastery-mastered text-mastery-mastered"
                    : picked
                      ? "border-destructive text-destructive"
                      : "border-border"
                  : picked
                    ? "border-primary"
                    : "border-border";
                return (
                  <button
                    key={oIndex}
                    disabled={submitted}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))}
                    className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40 ${tone}`}
                  >
                    {option}
                  </button>
                );
              })}
              {submitted && (
                <p className="pt-1 text-xs text-muted-foreground">{question.explanation}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length > 0 && (
        <div className="flex items-center gap-4">
          <Button onClick={() => void submit()} disabled={submitted}>
            Submit answers
          </Button>
          {submitted && (
            <span className="text-sm">
              You scored {correctCount}/{questions.length} ·{" "}
              {Math.round((correctCount / questions.length) * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
