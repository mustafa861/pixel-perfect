import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/hackathon")({
  head: () => ({
    meta: [
      { title: "Hackathon III Reference — LearnFlow" },
      {
        name: "description",
        content:
          "How LearnFlow maps the Hackathon III spec: reusable skills, agent mesh, event topics and mastery scoring.",
      },
      { property: "og:title", content: "Hackathon III Reference" },
      {
        property: "og:description",
        content: "Architecture reference mapping the LearnFlow build to the hackathon spec.",
      },
    ],
  }),
  component: HackathonPage,
});

const agents = [
  { name: "Triage", role: "Routes each student message to the right specialist." },
  { name: "Concepts", role: "Explains Python ideas with analogies and tiny examples." },
  { name: "Code review", role: "Reviews submissions for correctness, style and clarity." },
  { name: "Debug", role: "Reads tracebacks and walks the student to the fix." },
  { name: "Exercise", role: "Generates and grades practice tasks." },
  { name: "Progress", role: "Explains mastery scores and suggests the next focus." },
];

const topics = [
  "learning.session.started",
  "learning.question.asked",
  "learning.answer.given",
  "learning.quiz.completed",
  "code.submitted",
  "code.executed",
  "code.reviewed",
  "exercise.assigned",
  "exercise.completed",
  "struggle.detected",
];

const mapping = [
  {
    spec: "Kubernetes microservices",
    here: "Each concern is an isolated server function module with its own contract.",
  },
  {
    spec: "Kafka event backbone",
    here: "A durable Postgres event log with the same topic names, published on every action.",
  },
  {
    spec: "Dapr pub/sub + state",
    here: "The event client plus mastery store handle publish, subscribe-by-query and state.",
  },
  {
    spec: "Reusable skills",
    here: "Agent prompts are versioned, single-purpose files reused across every surface.",
  },
  {
    spec: "MCP code execution",
    here: "Python runs sandboxed in a worker with a hard timeout and captured streams.",
  },
];

function HackathonPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Hackathon III reference</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reusable intelligence and cloud-native mastery — how this build maps to the spec.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent mesh</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {agents.map((agent) => (
            <div key={agent.name} className="rounded-md border border-border px-3 py-2">
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.role}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event topics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="font-mono text-[11px] font-normal">
              {topic}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spec to implementation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {mapping.map((row) => (
            <div key={row.spec} className="rounded-md border border-border px-3 py-2">
              <p className="text-sm font-medium">{row.spec}</p>
              <p className="text-xs text-muted-foreground">{row.here}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mastery formula</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Mastery = 40% exercise scores + 30% quiz scores + 20% code quality + 10% consistency
          (streak). Bands: 0–40 beginner, 40–70 learning, 70–90 proficient, 90+ mastered.
        </CardContent>
      </Card>
    </div>
  );
}
