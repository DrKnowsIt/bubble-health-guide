-- Fix the remaining function
CREATE OR REPLACE FUNCTION public.is_alpha_tester(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    (SELECT alpha_tester 
     FROM public.profiles 
     WHERE email = user_email), 
    false
  );
$function$;