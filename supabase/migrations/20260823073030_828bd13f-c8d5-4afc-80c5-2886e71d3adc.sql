-- ROLES
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Learner',
  streak_days INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own role read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "own role insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role <> 'admin');

CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "profiles insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- CURRICULUM
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL
);
GRANT SELECT ON public.modules TO anon, authenticated;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules public read" ON public.modules FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL
);
GRANT SELECT ON public.topics TO anon, authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics public read" ON public.topics FOR SELECT TO anon, authenticated USING (true);

-- CHAT
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat sessions own" ON public.chat_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat sessions teacher read" ON public.chat_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  agent TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat messages own" ON public.chat_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat messages teacher read" ON public.chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- CODE
CREATE TABLE public.code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  stdout TEXT NOT NULL DEFAULT '',
  stderr TEXT NOT NULL DEFAULT '',
  error_type TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  quality_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.code_submissions TO authenticated;
GRANT ALL ON public.code_submissions TO service_role;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "code own" ON public.code_submissions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "code teacher read" ON public.code_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- QUIZZES
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz own" ON public.quiz_attempts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "quiz teacher read" ON public.quiz_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- EXERCISES
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  created_by UUID,
  assigned_to UUID,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  starter_code TEXT NOT NULL DEFAULT '',
  solution_hint TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises read" ON public.exercises FOR SELECT TO authenticated
  USING (assigned_to IS NULL OR assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "exercises insert" ON public.exercises FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "exercises update own" ON public.exercises FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "exercises delete own" ON public.exercises FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TABLE public.exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  passed BOOLEAN NOT NULL DEFAULT false,
  feedback TEXT NOT NULL DEFAULT '',
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.exercise_attempts TO authenticated;
GRANT ALL ON public.exercise_attempts TO service_role;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise attempts own" ON public.exercise_attempts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "exercise attempts teacher read" ON public.exercise_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- MASTERY
CREATE TABLE public.mastery_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  exercise_pct NUMERIC NOT NULL DEFAULT 0,
  quiz_pct NUMERIC NOT NULL DEFAULT 0,
  quality_pct NUMERIC NOT NULL DEFAULT 0,
  consistency_pct NUMERIC NOT NULL DEFAULT 0,
  mastery NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);
GRANT SELECT, INSERT, UPDATE ON public.mastery_scores TO authenticated;
GRANT ALL ON public.mastery_scores TO service_role;
ALTER TABLE public.mastery_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mastery own" ON public.mastery_scores FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "mastery teacher read" ON public.mastery_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- EVENT STREAM
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_user_created_idx ON public.events (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events own" ON public.events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "events teacher read" ON public.events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- STRUGGLE ALERTS
CREATE TABLE public.struggle_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  trigger TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.struggle_alerts TO authenticated;
GRANT ALL ON public.struggle_alerts TO service_role;
ALTER TABLE public.struggle_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts student own" ON public.struggle_alerts FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "alerts teacher read" ON public.struggle_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "alerts teacher update" ON public.struggle_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'teacher'));

-- SEED CURRICULUM
INSERT INTO public.modules (slug, title, description, order_index) VALUES
('basics', 'Basics', 'Variables, data types, input/output and operators.', 1),
('control-flow', 'Control Flow', 'Conditionals and loops that steer your programs.', 2),
('data-structures', 'Data Structures', 'Lists, tuples, dictionaries and sets.', 3),
('functions', 'Functions', 'Reusable blocks, parameters, returns and scope.', 4),
('oop', 'OOP', 'Classes, objects, inheritance and encapsulation.', 5),
('files', 'Files', 'Reading and writing files, CSV and JSON.', 6),
('errors', 'Errors', 'Exceptions, try/except and debugging.', 7),
('libraries', 'Libraries', 'Packages, APIs and virtual environments.', 8);

INSERT INTO public.topics (module_id, slug, title, summary, order_index)
SELECT m.id, t.slug, t.title, t.summary, t.order_index FROM public.modules m
JOIN (VALUES
('basics','basics-variables','Variables','Naming and assigning values.',1),
('basics','basics-data-types','Data Types','Numbers, strings, booleans.',2),
('basics','basics-io','Input/Output','print() and input().',3),
('basics','basics-operators','Operators','Arithmetic, comparison, logical.',4),
('basics','basics-type-conversion','Type Conversion','int(), str(), float().',5),
('control-flow','cf-conditionals','Conditionals','if / elif / else.',1),
('control-flow','cf-for-loops','For Loops','Iterating over sequences.',2),
('control-flow','cf-while-loops','While Loops','Looping on a condition.',3),
('control-flow','cf-break-continue','Break & Continue','Controlling loop flow.',4),
('data-structures','ds-lists','Lists','Ordered mutable collections.',1),
('data-structures','ds-tuples','Tuples','Immutable sequences.',2),
('data-structures','ds-dicts','Dictionaries','Key/value mappings.',3),
('data-structures','ds-sets','Sets','Unique unordered collections.',4),
('functions','fn-defining','Defining Functions','def and docstrings.',1),
('functions','fn-parameters','Parameters','Positional, keyword, defaults.',2),
('functions','fn-return','Return Values','Returning results.',3),
('functions','fn-scope','Scope','Local vs global names.',4),
('oop','oop-classes','Classes & Objects','Defining and instantiating.',1),
('oop','oop-attributes','Attributes & Methods','State and behaviour.',2),
('oop','oop-inheritance','Inheritance','Extending classes.',3),
('oop','oop-encapsulation','Encapsulation','Hiding internals.',4),
('files','files-read-write','Reading/Writing Files','open(), read(), write().',1),
('files','files-csv','CSV Processing','The csv module.',2),
('files','files-json','JSON Handling','The json module.',3),
('errors','err-try-except','Try/Except','Catching exceptions.',1),
('errors','err-types','Exception Types','Built-in exceptions.',2),
('errors','err-custom','Custom Exceptions','Defining your own.',3),
('errors','err-debugging','Debugging','Reading tracebacks.',4),
('libraries','lib-installing','Installing Packages','pip basics.',1),
('libraries','lib-apis','Working with APIs','HTTP requests and JSON.',2),
('libraries','lib-venv','Virtual Environments','Isolating dependencies.',3)
) AS t(module_slug, slug, title, summary, order_index) ON t.module_slug = m.slug;