-- Create a function to get total user count that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_total_user_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.profiles;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_total_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_user_count() TO anon;