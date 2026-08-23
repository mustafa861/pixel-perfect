import { generateText, streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayProvider,
  getGatewayKey,
  LEARNFLOW_MODEL,
  LEARNFLOW_PROVIDER_OPTIONS,
} from "./ai-gateway.server";
import {
  AGENT_PROMPTS,
  TRIAGE_PROMPT,
  extractQuality,
  type AgentName,
} from "./agents.server";

function model(structured = false) {
  const gateway = createLovableAiGatewayProvider(getGatewayKey(), undefined, {
    structuredOutputs: structured,
  });
  return gateway(LEARNFLOW_MODEL);
}

const SPECIALISTS = ["concepts", "code_review", "debug", "exercise", "progress"] as const;
type Specialist = (typeof SPECIALISTS)[number];

export async function runTutor(data: {
  message: string;
  topicTitle?: string | undefined;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  const triage = await generateText({
    model: model(),
    system: TRIAGE_PROMPT,
    prompt: data.message.slice(0, 1500),
    providerOptions: { lovable: { reasoning_effort: "none", max_completion_tokens: 12 } },
  });

  const picked = triage.text.trim().toLowerCase();
  const agent: Specialist =
    (SPECIALISTS.find((name) => picked.includes(name)) as Specialist) ?? "concepts";

  const context = data.topicTitle ? `\nCurrent topic: ${data.topicTitle}.` : "";
  const result = streamText({
    model: model(),
    system: AGENT_PROMPTS[agent] + context,
    messages: [...data.history, { role: "user" as const, content: data.message }],
    providerOptions: LEARNFLOW_PROVIDER_OPTIONS,
  });

  const text = await result.text;
  return { agent: agent as AgentName, content: text };
}

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correct_index: z.number(),
      explanation: z.string(),
    }),
  ),
});

export async function runQuizGeneration(data: { topicTitle: string; count: number }) {
  try {
    const result = streamText({
      model: model(true),
      system:
        "You write beginner Python multiple-choice quizzes. Exactly 4 options per question, one correct. Keep questions short and practical.",
      prompt: `Write ${data.count} multiple-choice questions about the Python topic "${data.topicTitle}". correct_index is the 0-based index of the right option.`,
      output: Output.object({ schema: quizSchema }),
      providerOptions: LEARNFLOW_PROVIDER_OPTIONS,
    });
    const output = await result.output;
    return { questions: output.questions.slice(0, data.count) };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) return { questions: [] };
    throw error;
  }
}

export async function runCodeReview(data: {
  code: string;
  topicTitle?: string | undefined;
  stdout: string;
  stderr: string;
}) {
  const result = streamText({
    model: model(),
    system: AGENT_PROMPTS.code_review,
    prompt: `Topic: ${data.topicTitle ?? "general Python"}\n\nCode:\n\`\`\`python\n${data.code}\n\`\`\`\n\nstdout:\n${data.stdout || "(none)"}\n\nstderr:\n${data.stderr || "(none)"}`,
    providerOptions: LEARNFLOW_PROVIDER_OPTIONS,
  });
  const text = await result.text;
  return { feedback: text, quality: extractQuality(text) };
}

const exercisesSchema = z.object({
  exercises: z.array(
    z.object({
      title: z.string(),
      prompt: z.string(),
      difficulty: z.string(),
      starter_code: z.string(),
      solution_hint: z.string(),
    }),
  ),
});

export async function runExerciseGeneration(data: {
  request: string;
  topicTitle?: string | undefined;
  count: number;
}) {
  try {
    const result = streamText({
      model: model(true),
      system: AGENT_PROMPTS.exercise,
      prompt: `Generate ${data.count} Python coding exercises. Teacher request: "${data.request}". Topic: ${data.topicTitle ?? "any"}. difficulty must be one of easy, medium, hard. starter_code is a short Python stub with a TODO comment. solution_hint is one sentence, never the full solution.`,
      output: Output.object({ schema: exercisesSchema }),
      providerOptions: LEARNFLOW_PROVIDER_OPTIONS,
    });
    const output = await result.output;
    return { exercises: output.exercises.slice(0, data.count) };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) return { exercises: [] };
    throw error;
  }
}

const gradeSchema = z.object({
  passed: z.boolean(),
  score: z.number(),
  feedback: z.string(),
});

export async function runExerciseGrading(data: {
  prompt: string;
  code: string;
  stdout: string;
  stderr: string;
}) {
  try {
    const result = streamText({
      model: model(true),
      system:
        "You auto-grade beginner Python exercise submissions. score is 0-100. Be encouraging but honest; feedback is at most 3 sentences.",
      prompt: `Exercise: ${data.prompt}\n\nSubmission:\n\`\`\`python\n${data.code}\n\`\`\`\n\nstdout:\n${data.stdout || "(none)"}\n\nstderr:\n${data.stderr || "(none)"}`,
      output: Output.object({ schema: gradeSchema }),
      providerOptions: LEARNFLOW_PROVIDER_OPTIONS,
    });
    const output = await result.output;
    return {
      passed: output.passed,
      score: Math.max(0, Math.min(100, output.score)),
      feedback: output.feedback,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { passed: false, score: 0, feedback: "Grading is unavailable right now." };
    }
    throw error;
  }
}
