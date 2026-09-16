-- profiles.email is nullable because some identity providers do not return email.
ALTER TABLE profiles ADD COLUMN email text;

-- Preserve email for users created before this migration.
UPDATE profiles AS p
SET email = u.email
FROM auth.users AS u
WHERE p.id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  RETURN NEW;
END;
$$;
