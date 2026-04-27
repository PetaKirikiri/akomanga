-- HR admin role: org-scoped client_id on app_users/students, helpers, RLS for classes & enrollments,
-- and extended snapshot for the SPA.

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS client_id integer;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS client_id integer;

CREATE OR REPLACE FUNCTION public.current_app_user_client_id ()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.client_id
  FROM public.app_users au
  WHERE au.auth_user_id = auth.uid ()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_hr_admin ()
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
      AND au.role = 'hr_admin'
      AND au.client_id IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.current_app_user_client_id () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_app_user_client_id () TO authenticated;

REVOKE ALL ON FUNCTION public.is_hr_admin () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_hr_admin () TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_get_auth_snapshot ()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid ();
BEGIN
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT json_build_object(
      'app_user', json_build_object(
        'id', au.id,
        'email', au.email,
        'display_name', au.display_name,
        'role', au.role,
        'client_id', au.client_id
      ),
      'student_id', s.id
    )
    FROM public.app_users au
    LEFT JOIN public.students s ON s.app_user_id = au.id
    WHERE au.auth_user_id IS NOT NULL
      AND au.auth_user_id::text = uid::text
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.portal_get_auth_snapshot () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.portal_get_auth_snapshot () TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_ensure_app_user_for_auth ()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid ();
  v_email text;
  v_display text;
  au_id int;
  v_role text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(trim(COALESCE(u.email, ''))),
    NULLIF(
      trim(
        COALESCE(
          u.raw_user_meta_data ->> 'full_name',
          u.raw_user_meta_data ->> 'name',
          u.raw_user_meta_data ->> 'display_name',
          split_part(COALESCE(u.email, ''), '@', 1)
        )
      ),
      ''
    )
  INTO v_email, v_display
  FROM auth.users u
  WHERE u.id = uid;

  IF v_email = '' THEN
    RETURN false;
  END IF;

  UPDATE public.app_users au
  SET auth_user_id = uid
  WHERE lower(trim(au.email)) = v_email
    AND (au.auth_user_id IS NULL OR au.auth_user_id = uid);

  IF NOT EXISTS (SELECT 1 FROM public.app_users au WHERE au.auth_user_id = uid) THEN
    IF EXISTS (
      SELECT 1
      FROM public.app_users au
      WHERE lower(trim(au.email)) = v_email
        AND au.auth_user_id IS NOT NULL
        AND au.auth_user_id <> uid
    ) THEN
      RETURN false;
    END IF;

    BEGIN
      INSERT INTO public.app_users (email, display_name, role, auth_user_id)
      VALUES (v_email, v_display, 'user', uid);
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE public.app_users au
        SET auth_user_id = uid
        WHERE lower(trim(au.email)) = v_email
          AND (au.auth_user_id IS NULL OR au.auth_user_id = uid);
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_users au WHERE au.auth_user_id = uid) THEN
    RETURN false;
  END IF;

  SELECT au.id, au.role INTO au_id, v_role
  FROM public.app_users au
  WHERE au.auth_user_id = uid
  LIMIT 1;

  IF au_id IS NOT NULL
    AND v_role IS DISTINCT FROM 'hr_admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.students s WHERE s.app_user_id = au_id
    ) THEN
    INSERT INTO public.students (name, email, app_user_id)
    VALUES (
      COALESCE(v_display, split_part(v_email, '@', 1)),
      v_email,
      au_id
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_ensure_app_user_for_auth () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.portal_ensure_app_user_for_auth () TO authenticated;

-- course_lessons: HR can read rows for courses their org runs (has a class).
CREATE POLICY "course_lessons_select_hr_client" ON public.course_lessons FOR
SELECT
  USING (
    public.is_hr_admin ()
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.course_id = course_lessons.course_id
        AND c.client_id = public.current_app_user_client_id ()
    )
  );

-- student_lesson_progress: HR read-only scope for org students.
CREATE POLICY "student_lesson_progress_select_hr" ON public.student_lesson_progress FOR
SELECT
  USING (
    public.is_hr_admin ()
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_lesson_progress.student_id
        AND s.client_id IS NOT NULL
        AND s.client_id = public.current_app_user_client_id ()
    )
  );

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classes_select ON public.classes;

CREATE POLICY classes_select ON public.classes FOR
SELECT
  USING (
    public.is_staff ()
    OR (
      public.is_hr_admin ()
      AND client_id = public.current_app_user_client_id ()
    )
    OR EXISTS (
      SELECT 1
      FROM public.class_enrollments ce
      INNER JOIN public.students s ON s.id = ce.student_id
      INNER JOIN public.app_users au ON au.id = s.app_user_id
      WHERE ce.class_id = classes.id
        AND au.auth_user_id IS NOT NULL
        AND au.auth_user_id::text = auth.uid ()::text
    )
  );

DROP POLICY IF EXISTS classes_insert_staff ON public.classes;

CREATE POLICY classes_insert_staff ON public.classes FOR INSERT TO authenticated
WITH
  CHECK (public.is_staff ());

DROP POLICY IF EXISTS classes_insert_hr ON public.classes;

CREATE POLICY classes_insert_hr ON public.classes FOR INSERT TO authenticated
WITH
  CHECK (
    public.is_hr_admin ()
    AND client_id = public.current_app_user_client_id ()
  );

DROP POLICY IF EXISTS classes_update_staff ON public.classes;

CREATE POLICY classes_update_staff ON public.classes FOR UPDATE TO authenticated USING (public.is_staff ())
WITH
  CHECK (public.is_staff ());

DROP POLICY IF EXISTS classes_update_hr ON public.classes;

CREATE POLICY classes_update_hr ON public.classes FOR UPDATE TO authenticated USING (
  public.is_hr_admin ()
  AND client_id = public.current_app_user_client_id ()
)
WITH
  CHECK (
    public.is_hr_admin ()
    AND client_id = public.current_app_user_client_id ()
  );

DROP POLICY IF EXISTS classes_delete_staff ON public.classes;

CREATE POLICY classes_delete_staff ON public.classes FOR DELETE TO authenticated USING (public.is_staff ());

DROP POLICY IF EXISTS classes_delete_hr ON public.classes;

CREATE POLICY classes_delete_hr ON public.classes FOR DELETE TO authenticated USING (
  public.is_hr_admin ()
  AND client_id = public.current_app_user_client_id ()
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ce_select_self ON public.class_enrollments;

CREATE POLICY ce_select_self ON public.class_enrollments FOR
SELECT
  USING (student_id = public.current_student_id ());

DROP POLICY IF EXISTS ce_select_staff ON public.class_enrollments;

CREATE POLICY ce_select_staff ON public.class_enrollments FOR
SELECT
  USING (public.is_staff ());

DROP POLICY IF EXISTS ce_select_hr ON public.class_enrollments;

CREATE POLICY ce_select_hr ON public.class_enrollments FOR
SELECT
  USING (
    public.is_hr_admin ()
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_enrollments.class_id
        AND c.client_id = public.current_app_user_client_id ()
    )
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = class_enrollments.student_id
        AND s.client_id IS NOT NULL
        AND s.client_id = public.current_app_user_client_id ()
    )
  );

DROP POLICY IF EXISTS ce_insert_staff ON public.class_enrollments;

CREATE POLICY ce_insert_staff ON public.class_enrollments FOR INSERT TO authenticated
WITH
  CHECK (public.is_staff ());

DROP POLICY IF EXISTS ce_insert_hr ON public.class_enrollments;

CREATE POLICY ce_insert_hr ON public.class_enrollments FOR INSERT TO authenticated
WITH
  CHECK (
    public.is_hr_admin ()
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_id
        AND c.client_id = public.current_app_user_client_id ()
    )
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_id
        AND s.client_id IS NOT NULL
        AND s.client_id = public.current_app_user_client_id ()
    )
  );

DROP POLICY IF EXISTS ce_delete_staff ON public.class_enrollments;

CREATE POLICY ce_delete_staff ON public.class_enrollments FOR DELETE TO authenticated USING (public.is_staff ());

DROP POLICY IF EXISTS ce_delete_hr ON public.class_enrollments;

CREATE POLICY ce_delete_hr ON public.class_enrollments FOR DELETE TO authenticated USING (
  public.is_hr_admin ()
  AND EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = class_enrollments.class_id
      AND c.client_id = public.current_app_user_client_id ()
  )
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = class_enrollments.student_id
      AND s.client_id IS NOT NULL
      AND s.client_id = public.current_app_user_client_id ()
  )
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_students_select_staff ON public.students;

CREATE POLICY portal_students_select_staff ON public.students FOR
SELECT
  USING (public.is_staff ());

DROP POLICY IF EXISTS portal_students_select_hr ON public.students;

CREATE POLICY portal_students_select_hr ON public.students FOR
SELECT
  USING (
    public.is_hr_admin ()
    AND students.client_id IS NOT NULL
    AND students.client_id = public.current_app_user_client_id ()
  );

DROP POLICY IF EXISTS portal_students_insert_staff ON public.students;

CREATE POLICY portal_students_insert_staff ON public.students FOR INSERT TO authenticated
WITH
  CHECK (public.is_staff ());

DROP POLICY IF EXISTS portal_students_insert_hr ON public.students;

CREATE POLICY portal_students_insert_hr ON public.students FOR INSERT TO authenticated
WITH
  CHECK (
    public.is_hr_admin ()
    AND client_id IS NOT NULL
    AND client_id = public.current_app_user_client_id ()
  );

DROP POLICY IF EXISTS portal_students_update_staff ON public.students;

CREATE POLICY portal_students_update_staff ON public.students FOR UPDATE TO authenticated USING (public.is_staff ())
WITH
  CHECK (public.is_staff ());

DROP POLICY IF EXISTS portal_students_update_hr ON public.students;

CREATE POLICY portal_students_update_hr ON public.students FOR UPDATE TO authenticated USING (
  public.is_hr_admin ()
  AND client_id IS NOT NULL
  AND client_id = public.current_app_user_client_id ()
)
WITH
  CHECK (
    public.is_hr_admin ()
    AND client_id IS NOT NULL
    AND client_id = public.current_app_user_client_id ()
  );

DROP POLICY IF EXISTS portal_students_delete_staff ON public.students;

CREATE POLICY portal_students_delete_staff ON public.students FOR DELETE TO authenticated USING (public.is_staff ());
