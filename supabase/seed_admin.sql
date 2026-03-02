-- ============================================================
-- Seed admin user: rafaeser@gmail.com
-- Run this in Supabase SQL Editor (with service role access)
-- ============================================================

DO $$
DECLARE
  new_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'rafaeser@gmail.com';

  IF existing_user_id IS NOT NULL THEN
    -- User exists: ensure profile has admin role
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = existing_user_id;

    RAISE NOTICE 'User already exists (id: %). Profile updated to admin.', existing_user_id;
  ELSE
    -- Create new user
    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'rafaeser@gmail.com',
      crypt('21126Ac8*', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Rafael", "role": "admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'rafaeser@gmail.com'),
      'email',
      new_user_id::text,
      now(),
      now(),
      now()
    );

    -- Explicitly set admin role on the profile created by the trigger
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = new_user_id;

    RAISE NOTICE 'Admin user created with id: %', new_user_id;
  END IF;
END;
$$;
