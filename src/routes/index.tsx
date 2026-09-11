import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LearnFlow — AI Python Tutoring Platform" },
      {
        name: "description",
        content:
          "Learn Python with a mesh of AI tutors, a sandboxed code runner, auto-graded exercises and live mastery scoring.",
      },
      { property: "og:title", content: "LearnFlow — AI Python Tutoring" },
      {
        property: "og:description",
        content: "AI tutors, a sandboxed Python runner and mastery tracking in one place.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    title: "Agent mesh tutoring",
    body: "A triage agent routes every question to a concepts, debug, review, exercise or progress specialist.",
  },
  {
    title: "Sandboxed Python",
    body: "Write and run Python straight in the browser with captured output and a hard timeout.",
  },
  {
    title: "Auto-graded practice",
    body: "Exercises and quizzes are generated and scored, feeding straight into your mastery profile.",
  },
  {
    title: "Live mastery scoring",
    body: "Exercises, quizzes, code quality and consistency combine into one score per topic.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-mono text-sm font-bold tracking-tight text-primary">
          learnflow<span className="text-muted-foreground">.py</span>
        </span>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="py-16 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Hackathon III · Reusable intelligence
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Learn Python with a team of AI tutors that actually track your progress.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            LearnFlow pairs a specialist agent mesh with a sandboxed code runner, auto-graded
            exercises and per-topic mastery scoring across an eight-module curriculum.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start learning</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">I'm a teacher</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          LearnFlow — built for Hackathon III: Reusable Intelligence and Cloud-Native Mastery.
        </div>
      </footer>
    </div>
  );
}
