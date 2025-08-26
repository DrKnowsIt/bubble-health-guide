-- Update the handle_new_user function to handle alpha tester access codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Insert into profiles with alpha_tester status from metadata
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name,
    email,
    alpha_tester
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'alpha_tester')::boolean, false)
  );
  
  -- Insert AI settings for the new user
  INSERT INTO public.ai_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;