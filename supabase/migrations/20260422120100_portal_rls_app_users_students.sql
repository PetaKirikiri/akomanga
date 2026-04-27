-- Optional direct SELECT for authenticated users (defense in depth for PostgREST + other RPC-free reads).
-- If this fails (existing conflicting policies), you can drop this file and rely on portal_get_auth_snapshot only.

DROP POLICY IF EXISTS portal_app_users_select_own ON public.app_users;

CREATE POLICY portal_app_users_select_own ON public.app_users FOR
SELECT
  TO authenticated USING (
    auth_user_id IS NOT NULL
    AND auth_user_id::text = auth.uid()::text
  );

DROP POLICY IF EXISTS portal_students_select_linked ON public.students;

CREATE POLICY portal_students_select_linked ON public.students FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.app_users au
      WHERE au.id = students.app_user_id
        AND au.auth_user_id IS NOT NULL
        AND au.auth_user_id::text = auth.uid()::text
    )
  );
