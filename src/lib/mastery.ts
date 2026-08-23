export type MasteryBand = "beginner" | "learning" | "proficient" | "mastered";

/** Spec weights: exercises 40%, quizzes 30%, code quality 20%, consistency 10%. */
export const MASTERY_WEIGHTS = {
  exercise: 0.4,
  quiz: 0.3,
  quality: 0.2,
  consistency: 0.1,
} as const;

export function computeMastery(parts: {
  exercise_pct: number;
  quiz_pct: number;
  quality_pct: number;
  consistency_pct: number;
}) {
  const value =
    parts.exercise_pct * MASTERY_WEIGHTS.exercise +
    parts.quiz_pct * MASTERY_WEIGHTS.quiz +
    parts.quality_pct * MASTERY_WEIGHTS.quality +
    parts.consistency_pct * MASTERY_WEIGHTS.consistency;
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function masteryBand(value: number): MasteryBand {
  if (value <= 40) return "beginner";
  if (value <= 70) return "learning";
  if (value <= 90) return "proficient";
  return "mastered";
}

export const BAND_LABEL: Record<MasteryBand, string> = {
  beginner: "Beginner",
  learning: "Learning",
  proficient: "Proficient",
  mastered: "Mastered",
};

export const BAND_TEXT: Record<MasteryBand, string> = {
  beginner: "text-mastery-beginner",
  learning: "text-mastery-learning",
  proficient: "text-mastery-proficient",
  mastered: "text-mastery-mastered",
};

export const BAND_BG: Record<MasteryBand, string> = {
  beginner: "bg-mastery-beginner",
  learning: "bg-mastery-learning",
  proficient: "bg-mastery-proficient",
  mastered: "bg-mastery-mastered",
};

export const BAND_STROKE: Record<MasteryBand, string> = {
  beginner: "stroke-mastery-beginner",
  learning: "stroke-mastery-learning",
  proficient: "stroke-mastery-proficient",
  mastered: "stroke-mastery-mastered",
};
