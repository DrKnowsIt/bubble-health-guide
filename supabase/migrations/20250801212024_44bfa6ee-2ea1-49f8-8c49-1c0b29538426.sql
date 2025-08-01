-- Fix search path security issue for is_alpha_tester function
CREATE OR REPLACE FUNCTION public.is_alpha_tester(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT alpha_tester 
     FROM public.profiles 
     WHERE email = user_email), 
    false
  );
$$;