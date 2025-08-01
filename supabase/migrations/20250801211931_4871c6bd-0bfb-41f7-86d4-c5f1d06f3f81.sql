-- Add alpha_tester column to profiles table
ALTER TABLE public.profiles ADD COLUMN alpha_tester BOOLEAN NOT NULL DEFAULT false;

-- Create function to check if user is alpha tester
CREATE OR REPLACE FUNCTION public.is_alpha_tester(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT alpha_tester 
     FROM public.profiles 
     WHERE email = user_email), 
    false
  );
$$;

-- Mark Alan Hourmand as alpha tester
UPDATE public.profiles 
SET alpha_tester = true 
WHERE email = 'alan.hourmand@gmail.com';

-- If Alan doesn't exist in profiles, insert him
INSERT INTO public.profiles (user_id, email, alpha_tester, first_name, last_name)
SELECT 
  auth.users.id,
  'alan.hourmand@gmail.com',
  true,
  'Alan',
  'Hourmand'
FROM auth.users 
WHERE auth.users.email = 'alan.hourmand@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'alan.hourmand@gmail.com'
);