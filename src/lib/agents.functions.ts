import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const askTutorInput = z.object({
  message: z.string().min(1).max(4000),
  topicTitle: z.string().max(200).optional(),
  history: z.array(messageSchema).max(20).default([]),
});

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => askTutorInput.parse(input))
  .handler(async ({ data }) => {
    const { runTutor } = await import("./agent-runtime.server");
    return runTutor(data);
  });

const quizInput = z.object({
  topicTitle: z.string().min(1).max(200),
  count: z.number().int().min(3).max(6).default(5),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quizInput.parse(input))
  .handler(async ({ data }) => {
    const { runQuizGeneration } = await import("./agent-runtime.server");
    return runQuizGeneration(data);
  });

const reviewInput = z.object({
  code: z.string().min(1).max(8000),
  topicTitle: z.string().max(200).optional(),
  stdout: z.string().max(4000).default(""),
  stderr: z.string().max(4000).default(""),
});

export const reviewCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewInput.parse(input))
  .handler(async ({ data }) => {
    const { runCodeReview } = await import("./agent-runtime.server");
    return runCodeReview(data);
  });

const exerciseGenInput = z.object({
  request: z.string().min(1).max(1000),
  topicTitle: z.string().max(200).optional(),
  count: z.number().int().min(1).max(5).default(3),
});

export const generateExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => exerciseGenInput.parse(input))
  .handler(async ({ data }) => {
    const { runExerciseGeneration } = await import("./agent-runtime.server");
    return runExerciseGeneration(data);
  });

const gradeInput = z.object({
  prompt: z.string().min(1).max(4000),
  code: z.string().min(1).max(8000),
  stdout: z.string().max(4000).default(""),
  stderr: z.string().max(4000).default(""),
});

export const gradeExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => gradeInput.parse(input))
  .handler(async ({ data }) => {
    const { runExerciseGrading } = await import("./agent-runtime.server");
    return runExerciseGrading(data);
  });
