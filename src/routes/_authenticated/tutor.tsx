import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { askTutor } from "@/lib/agents.functions";
import { publishEvent, raiseStruggle } from "@/lib/learnflow-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor — LearnFlow" },
      {
        name: "description",
        content:
          "Chat with the LearnFlow multi-agent Python tutor: concepts, debugging, code review and practice, routed automatically.",
      },
      { property: "og:title", content: "LearnFlow AI Python Tutor" },
      { property: "og:description", content: "A multi-agent tutor that explains, debugs and reviews Python." },
    ],
  }),
  component: TutorPage,
});

const STRUGGLE_PHRASES = [
  "i don't understand",
  "i dont understand",
  "i'm stuck",
  "im stuck",
  "i am stuck",
  "no idea",
  "makes no sense",
];

type Msg = { role: "user" | "assistant"; content: string; agent?: string };

function TutorPage() {
  const { user } = useAuth();
  const ask = useServerFn(askTutor);
  const [topicId, setTopicId] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: topics } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => (await supabase.from("topics").select("*").order("order_index")).data ?? [],
  });

  const topicTitle = topics?.find((t) => t.id === topicId)?.title;

  async function send() {
    const message = input.trim();
    if (!message || !user || busy) return;
    setInput("");
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setBusy(true);

    void publishEvent(user.id, "learning.question.asked", { message, topic_id: topicId || null });
    if (STRUGGLE_PHRASES.some((p) => message.toLowerCase().includes(p))) {
      void raiseStruggle(user.id, "phrase", message.slice(0, 300), topicId || null);
    }

    try {
      const result = await ask({
        data: { message, history, ...(topicTitle ? { topicTitle } : {}) },
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.content, agent: result.agent },
      ]);
      void publishEvent(user.id, "learning.answer.given", {
        agent: result.agent,
        topic_id: topicId || null,
      });
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      toast.error("The tutor could not answer just now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">AI Tutor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One message in, the triage agent picks the right specialist.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask anything — “explain list comprehensions”, paste a traceback, or ask for a challenge.
            </p>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[90%] rounded-lg border border-border bg-card px-3 py-2 text-sm"
              }
            >
              {msg.agent && (
                <Badge variant="secondary" className="mb-2 font-mono text-[10px]">
                  {msg.agent}
                </Badge>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          ))}
          {busy && <p className="text-sm text-muted-foreground">Thinking…</p>}
          <div ref={endRef} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Ask your Python question…"
          className="min-h-[80px]"
        />
        <Button onClick={() => void send()} disabled={busy}>
          Send
        </Button>
      </div>
    </div>
  );
}
