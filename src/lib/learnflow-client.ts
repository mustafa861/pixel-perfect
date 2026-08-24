import { supabase } from "@/integrations/supabase/client";
import { computeMastery } from "./mastery";

/** Event-stream topic names mirrored from the LearnFlow spec. */
export type EventTopic =
  | "learning.session.started"
  | "learning.question.asked"
  | "learning.answer.given"
  | "learning.quiz.completed"
  | "code.submitted"
  | "code.executed"
  | "code.reviewed"
  | "exercise.assigned"
  | "exercise.completed"
  | "struggle.detected";

export async function publishEvent(
  userId: string,
  topic: EventTopic,
  payload: Record<string, unknown>,
) {
  await supabase.from("events").insert({ user_id: userId, topic, payload });
}

export async function raiseStruggle(
  userId: string,
  trigger: string,
  detail: string,
  topicId: string | null,
) {
  await supabase
    .from("struggle_alerts")
    .insert({ student_id: userId, trigger, detail, topic_id: topicId });
  await publishEvent(userId, "struggle.detected", { trigger, detail, topic_id: topicId });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Recompute mastery for a topic: 40% exercises, 30% quizzes, 20% quality, 10% streak. */
export async function recomputeMastery(userId: string, topicId: string) {
  const [attempts, quizzes, submissions, profile] = await Promise.all([
    supabase
      .from("exercise_attempts")
      .select("score, exercises!inner(topic_id)")
      .eq("user_id", userId)
      .eq("exercises.topic_id", topicId),
    supabase.from("quiz_attempts").select("score").eq("user_id", userId).eq("topic_id", topicId),
    supabase
      .from("code_submissions")
      .select("quality_score")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .not("quality_score", "is", null),
    supabase.from("profiles").select("streak_days").eq("id", userId).maybeSingle(),
  ]);

  const exercise_pct = average((attempts.data ?? []).map((row) => Number(row.score)));
  const quiz_pct = average((quizzes.data ?? []).map((row) => Number(row.score)));
  const quality_pct = average(
    (submissions.data ?? []).map((row) => Number(row.quality_score ?? 0)),
  );
  const consistency_pct = Math.min(100, (profile.data?.streak_days ?? 0) * 20);

  const mastery = computeMastery({ exercise_pct, quiz_pct, quality_pct, consistency_pct });

  await supabase.from("mastery_scores").upsert(
    {
      user_id: userId,
      topic_id: topicId,
      exercise_pct: Math.round(exercise_pct),
      quiz_pct: Math.round(quiz_pct),
      quality_pct: Math.round(quality_pct),
      consistency_pct: Math.round(consistency_pct),
      mastery,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic_id" },
  );

  return mastery;
}

/** Keep the daily streak fresh on each active session. */
export async function touchStreak(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("streak_days, last_active_date")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return;

  const today = new Date().toISOString().slice(0, 10);
  if (data.last_active_date === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = data.last_active_date === yesterday ? data.streak_days + 1 : 1;

  await supabase
    .from("profiles")
    .update({ streak_days: streak, last_active_date: today })
    .eq("id", userId);
}
