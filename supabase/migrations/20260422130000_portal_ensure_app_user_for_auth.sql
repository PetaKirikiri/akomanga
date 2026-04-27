-- Auto-provision public.app_users (+ students) when Auth exists but no portal row.
-- Run after claim_app_user_by_email in the app.

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

  SELECT au.id INTO au_id
  FROM public.app_users au
  WHERE au.auth_user_id = uid
  LIMIT 1;

  IF au_id IS NOT NULL AND NOT EXISTS (
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
