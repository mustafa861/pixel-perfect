-- Better-Auth tables ----------------------------------------------------
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  issuer TEXT,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- App tables --------------------------------------------------------------
CREATE TABLE profiles (
  id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Learner',
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL
);

CREATE TABLE topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL
);

CREATE TABLE chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  agent TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE code_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  stdout TEXT NOT NULL DEFAULT '',
  stderr TEXT NOT NULL DEFAULT '',
  error_type TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  quality_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  assigned_to TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  starter_code TEXT NOT NULL DEFAULT '',
  solution_hint TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercise_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  passed BOOLEAN NOT NULL DEFAULT false,
  feedback TEXT NOT NULL DEFAULT '',
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mastery_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  exercise_pct NUMERIC NOT NULL DEFAULT 0,
  quiz_pct NUMERIC NOT NULL DEFAULT 0,
  quality_pct NUMERIC NOT NULL DEFAULT 0,
  consistency_pct NUMERIC NOT NULL DEFAULT 0,
  mastery NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mastery_scores_user_topic_key ON mastery_scores (user_id, topic_id);

CREATE TABLE events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_user_created_idx ON events (user_id, created_at);

CREATE TABLE struggle_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  trigger TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX struggle_alerts_resolved_idx ON struggle_alerts (resolved, created_at);

-- Seed curriculum (modules + topics) so dashboard/tutor/code/quiz dropdowns aren't empty.
INSERT INTO modules (slug, title, description, order_index) VALUES
  ('python-foundations', 'Python Foundations', 'Syntax, variables, control flow and functions.', 1),
  ('data-structures', 'Data Structures', 'Lists, dicts, sets, comprehensions and files.', 2),
  ('oop-and-testing', 'OOP & Testing', 'Classes, error handling, and writing tests.', 3);

INSERT INTO topics (module_id, slug, title, summary, order_index)
SELECT id, 'variables-and-types', 'Variables & Types', 'Naming, dynamic typing, and basic operators.', 1
FROM modules WHERE slug = 'python-foundations';
INSERT INTO topics (module_id, slug, title, summary, order_index)
SELECT id, 'control-flow', 'Control Flow', 'if/elif/else, loops, and boolean logic.', 2
FROM modules WHERE slug = 'python-foundations';
INSERT INTO topics (module_id, slug, title, summary, order_index)
SELECT id, 'functions', 'Functions', 'Defining functions, arguments, and return values.', 3
FROM modules WHERE slug = 'python-foundations';
INSERT INTO topics (module_id, slug, title, summary, order_index)
SELECT id, 'lists-and-dicts', 'Lists & Dictionaries', 'Core collection types and their methods.', 1
FROM modules WHERE slug = 'data-structures';
INSERT INTO topics (module_id, slug, title, summary, order_index)
SELECT id, 'comprehensions', 'Comprehensions', 'List, dict and set comprehensions.', 2
FROM modules WHERE slug = 'data-structures';
INSERT INTO topics (module_id, slug, title, summary, order_index)
SELECT id, 'classes', 'Classes & Objects', 'Defining classes, methods, and instances.', 1
FROM modules WHERE slug = 'oop-and-testing';
INSERT INTO topics (module_id, slug, title, summary, order_index)
SELECT id, 'error-handling', 'Error Handling', 'try/except, raising exceptions, and debugging.', 2
FROM modules WHERE slug = 'oop-and-testing';
