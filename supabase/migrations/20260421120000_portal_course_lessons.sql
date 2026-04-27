-- Portal: lesson materials (e.g. Google Docs) and per-student progress.
-- Apply with: supabase db push (or merge into Pūrākau migrations if that repo owns migrations).

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id serial PRIMARY KEY NOT NULL,
  course_id integer NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  lesson_number smallint NOT NULL CHECK (lesson_number >= 1 AND lesson_number <= 10),
  title text NOT NULL,
  external_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now (),
  UNIQUE (course_id, lesson_number)
);

CREATE INDEX IF NOT EXISTS course_lessons_course_id_idx ON public.course_lessons (course_id);

CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id serial PRIMARY KEY NOT NULL,
  student_id integer NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  course_id integer NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  lesson_number smallint NOT NULL CHECK (lesson_number >= 1 AND lesson_number <= 10),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now (),
  UNIQUE (student_id, course_id, lesson_number)
);

CREATE INDEX IF NOT EXISTS student_lesson_progress_student_idx ON public.student_lesson_progress (student_id);
CREATE INDEX IF NOT EXISTS student_lesson_progress_course_idx ON public.student_lesson_progress (course_id);

-- Helper: auth.uid() → app_users.role
CREATE OR REPLACE FUNCTION public.current_app_user_role ()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM public.app_users au
  WHERE au.auth_user_id = auth.uid ()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff ()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users au
    WHERE au.auth_user_id = auth.uid ()
      AND au.role IN ('super_admin', 'coordinator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin ()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users au
    WHERE au.auth_user_id = auth.uid ()
      AND au.role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_student_id ()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.students s
  INNER JOIN public.app_users au ON au.id = s.app_user_id
  WHERE au.auth_user_id = auth.uid ()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.student_enrolled_in_course (p_course_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_enrollments ce
    INNER JOIN public.classes c ON c.id = ce.class_id
    INNER JOIN public.students s ON s.id = ce.student_id
    INNER JOIN public.app_users au ON au.id = s.app_user_id
    WHERE c.course_id = p_course_id
      AND au.auth_user_id = auth.uid ()
  );
$$;

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_lessons_select_enrolled_or_staff" ON public.course_lessons FOR
SELECT
  USING (
    public.is_staff ()
    OR public.student_enrolled_in_course (course_id)
  );

CREATE POLICY "course_lessons_insert_super_admin" ON public.course_lessons FOR INSERT TO authenticated
WITH
  CHECK (public.is_super_admin ());

CREATE POLICY "course_lessons_update_super_admin" ON public.course_lessons FOR UPDATE TO authenticated USING (public.is_super_admin ())
WITH
  CHECK (public.is_super_admin ());

CREATE POLICY "course_lessons_delete_super_admin" ON public.course_lessons FOR DELETE TO authenticated USING (public.is_super_admin ());

ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_lesson_progress_select" ON public.student_lesson_progress FOR
SELECT
  USING (
    public.is_staff ()
    OR student_id = public.current_student_id ()
  );

CREATE POLICY "student_lesson_progress_insert" ON public.student_lesson_progress FOR INSERT TO authenticated
WITH
  CHECK (
    (
      student_id = public.current_student_id ()
        AND public.student_enrolled_in_course (course_id)
    )
    OR public.is_staff ()
  );

CREATE POLICY "student_lesson_progress_update" ON public.student_lesson_progress FOR UPDATE TO authenticated USING (
  student_id = public.current_student_id ()
  OR public.is_staff ()
)
WITH
  CHECK (
    student_id = public.current_student_id ()
    OR public.is_staff ()
  );

CREATE POLICY "student_lesson_progress_delete_staff" ON public.student_lesson_progress FOR DELETE TO authenticated USING (public.is_super_admin ());
