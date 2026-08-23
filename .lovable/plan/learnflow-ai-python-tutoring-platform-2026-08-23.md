# LearnFlow — AI Python Tutoring Platform

Build the full LearnFlow application from the Hackathon III spec as a working web app, plus an in-app hackathon reference section.

## Scope note (read first)

Lovable builds web apps. Kubernetes, Minikube, Kafka brokers, Dapr sidecars, Docker, Argo CD, Claude Code / Goose Skills files and MCP servers cannot run inside a Lovable project. What the plan delivers instead:

- Every LearnFlow product feature from Part 8, fully working (auth, agents, editor, quizzes, mastery, teacher tools).
- The event-driven architecture modeled faithfully in the app: agents publish to a persisted event stream with the spec's topic names (`learning.*`, `code.*`, `exercise.*`, `struggle.*`), consumed by the progress and struggle-detection logic. Same patterns, no Kafka cluster.
- A "Hackathon" section in the app documenting the spec, architecture diagram, curriculum, rules, timeline, and evaluation criteria.

## What gets built

### Roles and auth
Email/password sign-up with a role choice (student or teacher), stored in a separate roles table. Students land on the learning dashboard, teachers on the class dashboard.

### Student experience
- **Dashboard** — 8 curriculum modules with mastery rings, current module callout ("Module 2: Loops — 60% complete"), streak counter, recent activity.
- **Module & topic pages** — topics per the Part 8 curriculum table.
- **Tutor chat** — multi-agent system routed by a triage step: Concepts, Code Review, Debug, Exercise, Progress. Streaming responses, per-agent labels, chat history saved.
- **Code editor** — in-browser Python editor with syntax highlighting, running against a sandboxed Pyodide runtime in the browser (5s timeout, stdlib only, no network/file access — matches the spec's sandbox rules).
- **Quizzes** — generated per topic, auto-graded, scores feed mastery.
- **Exercises** — assigned or agent-generated coding challenges with auto-grading.
- **Progress page** — mastery per topic with the Beginner / Learning / Proficient / Mastered color bands.

### Teacher experience
- Class roster with per-student mastery heatmap.
- Struggle alert inbox (triggered by the spec rules: same error 3+ times, quiz < 50%, 5+ failed runs, >10 min stuck, "I'm stuck" phrasing).
- Drill into a student's code attempts and chat history.
- Prompt-based exercise generation ("Create easy exercises on list comprehensions") and one-click assign.

### Business rules
Mastery = 40% exercises + 30% quizzes + 20% code quality + 10% streak, recomputed on every relevant event.

### Hackathon reference section
Static pages rendering Parts 1–10 of the document: overview, glossary, Goose vs Claude Code, Skills + MCP code execution, LearnFlow architecture diagram, deliverables, timeline, evaluation rubric, FAQ.

## Technical approach

- Lovable Cloud for auth, Postgres, and storage; RLS on every table with a separate `user_roles` table and a `has_role` security-definer function.
- Tables: profiles, user_roles, modules, topics, enrollments, chat_sessions, chat_messages, code_submissions, quizzes, quiz_attempts, exercises, exercise_attempts, mastery_scores, events (the pub/sub log), struggle_alerts. Curriculum modules/topics seeded via migration.
- Agents run as TanStack server functions calling the Lovable AI gateway, each with its own system prompt; triage picks the specialist, then the specialist streams back. Every call writes an event row, and consumers (mastery, struggle detection) react to those events.
- Code execution is client-side Pyodide in a Web Worker with a hard timeout — no server-side Python, no network access from user code.
- Design: distinctive dark editor-inspired theme with semantic tokens in `src/styles.css`; no default purple-on-white AI look.

## Suggested build order

1. Cloud enablement, schema, RLS, curriculum seed, auth + role routing.
2. Student dashboard, modules, mastery display.
3. Tutor chat with the agent system and event log.
4. Code editor + Pyodide sandbox + code review/debug agents.
5. Quizzes, exercises, mastery calculation.
6. Teacher dashboard, struggle alerts, exercise generation and assignment.
7. Hackathon reference section, SEO metadata, polish.

This is a large build — it will run over several turns.
