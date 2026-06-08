-- ============================================================
-- SplitFlow — TRIGGER FIX SCRIPT
-- Run this in Supabase SQL Editor if signup returns 500
-- ============================================================

-- Fix 1: Rebuild generate_split_id() with explicit search_path
-- (Required so the function can find public.profiles when called
-- from the auth schema trigger context)

CREATE OR REPLACE FUNCTION public.generate_split_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'SPL-';
  i INT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    result := 'SPL-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE split_id = result
    ) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Fix 2: Rebuild handle_new_user() with explicit search_path
-- and fully-qualified table/function names

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, split_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    public.generate_split_id()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't block signup
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Fix 3: Re-create the trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix 4: Grant usage so the trigger function can run properly
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- Verify: Quick sanity check queries (these should return without errors)
SELECT proname, prosecdef FROM pg_proc
  WHERE proname IN ('handle_new_user', 'generate_split_id');

SELECT tgname FROM pg_trigger
  WHERE tgname = 'on_auth_user_created';
