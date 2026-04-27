-- Portal profile read for AuthContext (SECURITY DEFINER bypasses RLS on app_users / students).
-- Apply before relying on direct PostgREST reads from the anon/authenticated client.

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
        'role', au.role
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
