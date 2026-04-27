-- Link auth.users ↔ app_users when a coordinator pre-created app_users with the same email and auth_user_id IS NULL.
-- Client calls public.claim_app_user_by_email() after sign-in; then reloads app_users by auth_user_id.

CREATE OR REPLACE FUNCTION public.claim_app_user_by_email ()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  n int := 0;
BEGIN
  SELECT lower(trim(COALESCE(u.email, '')))
  INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid ();

  IF v_email = '' THEN
    RETURN false;
  END IF;

  UPDATE public.app_users au
  SET auth_user_id = auth.uid ()
  WHERE lower(trim(au.email)) = v_email
    AND (au.auth_user_id IS NULL OR au.auth_user_id = auth.uid ());

  GET DIAGNOSTICS n = ROW_COUNT;

  RETURN n > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_app_user_by_email () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_app_user_by_email () TO authenticated;
