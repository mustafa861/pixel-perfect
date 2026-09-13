import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { requireAuth, requireTeacher } from "@/lib/require-auth.server";
import { computeMastery } from "@/lib/mastery";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function recomputeMasteryInternal(userId: string, topicId: string) {
  const { getDb } = await import("@/lib/db.server");
  const { exerciseAttempts, exercises, quizAttempts, codeSubmissions, profiles, masteryScores } =
    await import("@/lib/schema");
  const db = getDb();

  const [attempts, quizzes, submissions, [profile]] = await Promise.all([
    db
      .select({ score: exerciseAttempts.score })
      .from(exerciseAttempts)
      .innerJoin(exercises, eq(exerciseAttempts.exerciseId, exercises.id))
      .where(and(eq(exerciseAttempts.userId, userId), eq(exercises.topicId, topicId))),
    db
      .select({ score: quizAttempts.score })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.topicId, topicId))),
    db
      .select({ qualityScore: codeSubmissions.qualityScore })
      .from(codeSubmissions)
      .where(and(eq(codeSubmissions.userId, userId), eq(codeSubmissions.topicId, topicId))),
    db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
  ]);

  const exercise_pct = average(attempts.map((row) => Number(row.score)));
  const quiz_pct = average(quizzes.map((row) => Number(row.score)));
  const quality_pct = average(
    submissions.filter((row) => row.qualityScore != null).map((row) => Number(row.qualityScore)),
  );
  const consistency_pct = Math.min(100, (profile?.streakDays ?? 0) * 20);

  const mastery = computeMastery({ exercise_pct, quiz_pct, quality_pct, consistency_pct });

  await db
    .insert(masteryScores)
    .values({
      userId,
      topicId,
      exercisePct: String(Math.round(exercise_pct)),
      quizPct: String(Math.round(quiz_pct)),
      qualityPct: String(Math.round(quality_pct)),
      consistencyPct: String(Math.round(consistency_pct)),
      mastery: String(mastery),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [masteryScores.userId, masteryScores.topicId],
      set: {
        exercisePct: String(Math.round(exercise_pct)),
        quizPct: String(Math.round(quiz_pct)),
        qualityPct: String(Math.round(quality_pct)),
        consistencyPct: String(Math.round(consistency_pct)),
        mastery: String(mastery),
        updatedAt: new Date(),
      },
    });

  return mastery;
}

/* ------------------------------------------------------------------ */
/* Topics / curriculum (public reads)                                   */
/* ------------------------------------------------------------------ */

export const getTopics = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb } = await import("@/lib/db.server");
  const { topics } = await import("@/lib/schema");
  const db = getDb();
  return db.select().from(topics).orderBy(topics.orderIndex);
});

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { modules, topics, masteryScores, profiles, events } = await import("@/lib/schema");
    const db = getDb();
    const userId = context.userId;

    const [moduleRows, topicRows, masteryRows, [profile], eventRows] = await Promise.all([
      db.select().from(modules).orderBy(modules.orderIndex),
      db.select().from(topics).orderBy(topics.orderIndex),
      db.select().from(masteryScores).where(eq(masteryScores.userId, userId)),
      db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
      db
        .select()
        .from(events)
        .where(eq(events.userId, userId))
        .orderBy(desc(events.createdAt))
        .limit(8),
    ]);

    return {
      modules: moduleRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        order_index: row.orderIndex,
      })),
      topics: topicRows.map((row) => ({
        id: row.id,
        module_id: row.moduleId,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        order_index: row.orderIndex,
      })),
      mastery: masteryRows.map((row) => ({ topic_id: row.topicId, mastery: Number(row.mastery) })),
      profile: profile
        ? { display_name: profile.displayName, streak_days: profile.streakDays }
        : null,
      events: eventRows.map((row) => ({
        id: row.id,
        topic: row.topic,
        created_at: row.createdAt.toISOString(),
      })),
    };
  });

export const touchStreak = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { profiles } = await import("@/lib/schema");
    const db = getDb();
    const userId = context.userId;

    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (!profile) return { ok: true };

    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastActiveDate === today) return { ok: true };

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = profile.lastActiveDate === yesterday ? profile.streakDays + 1 : 1;

    await db
      .update(profiles)
      .set({ streakDays: streak, lastActiveDate: today })
      .where(eq(profiles.id, userId));
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Events / struggle alerts                                             */
/* ------------------------------------------------------------------ */

const eventInput = z.object({
  topic: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const publishEvent = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => eventInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { events } = await import("@/lib/schema");
    const db = getDb();
    await db.insert(events).values({ userId: context.userId, topic: data.topic, payload: data.payload });
    return { ok: true };
  });

const struggleInput = z.object({
  trigger: z.string().min(1).max(60),
  detail: z.string().max(500),
  topicId: z.string().uuid().nullable(),
});

export const raiseStruggle = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => struggleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { struggleAlerts, events } = await import("@/lib/schema");
    const db = getDb();
    await db.insert(struggleAlerts).values({
      studentId: context.userId,
      trigger: data.trigger,
      detail: data.detail,
      topicId: data.topicId,
    });
    await db.insert(events).values({
      userId: context.userId,
      topic: "struggle.detected",
      payload: { trigger: data.trigger, detail: data.detail, topic_id: data.topicId },
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Code sandbox                                                         */
/* ------------------------------------------------------------------ */

const codeRunInput = z.object({
  topicId: z.string().uuid().nullable(),
  code: z.string().min(1).max(20000),
  stdout: z.string().max(20000),
  stderr: z.string().max(20000),
  success: z.boolean(),
  errorType: z.string().max(120).nullable(),
});

export const recordCodeRun = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => codeRunInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { codeSubmissions } = await import("@/lib/schema");
    const db = getDb();
    await db.insert(codeSubmissions).values({
      userId: context.userId,
      topicId: data.topicId,
      code: data.code,
      stdout: data.stdout,
      stderr: data.stderr,
      success: data.success,
      errorType: data.errorType,
    });
    return { ok: true };
  });

const codeReviewInput = codeRunInput.extend({
  qualityScore: z.number().int().min(0).max(100),
});

export const recordCodeReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => codeReviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { codeSubmissions } = await import("@/lib/schema");
    const db = getDb();
    await db.insert(codeSubmissions).values({
      userId: context.userId,
      topicId: data.topicId,
      code: data.code,
      stdout: data.stdout,
      stderr: data.stderr,
      success: data.success,
      errorType: data.errorType,
      qualityScore: data.qualityScore,
    });
    if (data.topicId) await recomputeMasteryInternal(context.userId, data.topicId);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Quiz                                                                  */
/* ------------------------------------------------------------------ */

const quizSubmitInput = z.object({
  topicId: z.string().uuid().nullable(),
  questions: z.array(z.record(z.string(), z.unknown())),
  answers: z.record(z.string(), z.number()),
  correctCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  score: z.number().int().min(0).max(100),
  topicTitle: z.string().max(200).optional(),
});

export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => quizSubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { quizAttempts, events, struggleAlerts } = await import("@/lib/schema");
    const db = getDb();
    const userId = context.userId;

    await db.insert(quizAttempts).values({
      userId,
      topicId: data.topicId,
      questions: data.questions,
      answers: data.answers,
      correctCount: data.correctCount,
      totalCount: data.totalCount,
      score: String(data.score),
    });
    await db.insert(events).values({
      userId,
      topic: "learning.quiz.completed",
      payload: { score: data.score, topic_id: data.topicId },
    });
    if (data.score < 50) {
      await db.insert(struggleAlerts).values({
        studentId: userId,
        trigger: "quiz",
        detail: `Scored ${data.score}% on ${data.topicTitle ?? "a quiz"}`,
        topicId: data.topicId,
      });
    }
    if (data.topicId) await recomputeMasteryInternal(userId, data.topicId);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Exercises                                                             */
/* ------------------------------------------------------------------ */

export const getExercisesData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { exercises, exerciseAttempts } = await import("@/lib/schema");
    const db = getDb();
    const userId = context.userId;

    const [exerciseRows, attemptRows] = await Promise.all([
      db
        .select()
        .from(exercises)
        .where(or(isNull(exercises.assignedTo), eq(exercises.assignedTo, userId)))
        .orderBy(desc(exercises.createdAt)),
      db.select().from(exerciseAttempts).where(eq(exerciseAttempts.userId, userId)),
    ]);

    return {
      exercises: exerciseRows.map((row) => ({
        id: row.id,
        title: row.title,
        prompt: row.prompt,
        difficulty: row.difficulty,
        starter_code: row.starterCode,
        solution_hint: row.solutionHint,
        topic_id: row.topicId,
      })),
      attempts: attemptRows.map((row) => ({
        exercise_id: row.exerciseId,
        score: Number(row.score),
      })),
    };
  });

const exerciseSubmitInput = z.object({
  exerciseId: z.string().uuid(),
  topicId: z.string().uuid().nullable(),
  code: z.string().min(1).max(20000),
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  feedback: z.string().max(4000),
});

export const submitExerciseAttempt = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => exerciseSubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { exerciseAttempts, events } = await import("@/lib/schema");
    const db = getDb();
    const userId = context.userId;

    await db.insert(exerciseAttempts).values({
      exerciseId: data.exerciseId,
      userId,
      code: data.code,
      passed: data.passed,
      score: String(data.score),
      feedback: data.feedback,
    });
    await db.insert(events).values({
      userId,
      topic: "exercise.completed",
      payload: { exercise_id: data.exerciseId, score: data.score },
    });
    if (data.topicId) await recomputeMasteryInternal(userId, data.topicId);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Progress                                                              */
/* ------------------------------------------------------------------ */

export const getProgressData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { topics, masteryScores, quizAttempts } = await import("@/lib/schema");
    const db = getDb();
    const userId = context.userId;

    const [topicRows, masteryRows, quizRows] = await Promise.all([
      db.select().from(topics).orderBy(topics.orderIndex),
      db.select().from(masteryScores).where(eq(masteryScores.userId, userId)),
      db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(10),
    ]);

    return {
      topics: topicRows,
      mastery: masteryRows.map((row) => ({
        topic_id: row.topicId,
        mastery: Number(row.mastery),
        exercise_pct: Number(row.exercisePct),
        quiz_pct: Number(row.quizPct),
        quality_pct: Number(row.qualityPct),
        consistency_pct: Number(row.consistencyPct),
      })),
      quizzes: quizRows.map((row) => ({
        id: row.id,
        topic_id: row.topicId,
        correct_count: row.correctCount,
        total_count: row.totalCount,
        score: Number(row.score),
      })),
    };
  });

/* ------------------------------------------------------------------ */
/* Teacher                                                               */
/* ------------------------------------------------------------------ */

export const getTeacherClassData = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async () => {
    const { getDb } = await import("@/lib/db.server");
    const { profiles, masteryScores, struggleAlerts, exercises } = await import("@/lib/schema");
    const db = getDb();

    const [profileRows, masteryRows, alertRows, exerciseRows] = await Promise.all([
      db.select().from(profiles),
      db.select().from(masteryScores),
      db
        .select()
        .from(struggleAlerts)
        .where(eq(struggleAlerts.resolved, false))
        .orderBy(desc(struggleAlerts.createdAt))
        .limit(20),
      db.select().from(exercises).orderBy(desc(exercises.createdAt)).limit(10),
    ]);

    return {
      profiles: profileRows.map((row) => ({
        id: row.id,
        display_name: row.displayName,
        streak_days: row.streakDays,
      })),
      mastery: masteryRows.map((row) => ({
        user_id: row.userId,
        mastery: Number(row.mastery),
        topic_id: row.topicId,
      })),
      alerts: alertRows.map((row) => ({
        id: row.id,
        student_id: row.studentId,
        trigger: row.trigger,
        detail: row.detail,
        created_at: row.createdAt.toISOString(),
      })),
      exercises: exerciseRows.map((row) => ({
        id: row.id,
        title: row.title,
        difficulty: row.difficulty,
        created_at: row.createdAt.toISOString(),
      })),
    };
  });

const bulkExerciseInput = z.object({
  exercises: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        prompt: z.string().min(1).max(4000),
        difficulty: z.string().min(1).max(20),
        starter_code: z.string().max(4000).default(""),
        solution_hint: z.string().max(1000).default(""),
      }),
    )
    .min(1)
    .max(10),
});

export const createExercisesBulk = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: unknown) => bulkExerciseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDb } = await import("@/lib/db.server");
    const { exercises } = await import("@/lib/schema");
    const db = getDb();
    await db.insert(exercises).values(
      data.exercises.map((exercise) => ({
        title: exercise.title,
        prompt: exercise.prompt,
        difficulty: exercise.difficulty,
        starterCode: exercise.starter_code,
        solutionHint: exercise.solution_hint,
        createdBy: context.userId,
      })),
    );
    return { ok: true };
  });

export const resolveStruggleAlert = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const { struggleAlerts } = await import("@/lib/schema");
    const db = getDb();
    await db.update(struggleAlerts).set({ resolved: true }).where(eq(struggleAlerts.id, data.id));
    return { ok: true };
  });
