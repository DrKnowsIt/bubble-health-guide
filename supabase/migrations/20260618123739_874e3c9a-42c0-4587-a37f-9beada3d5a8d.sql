
-- 1) Privilege escalation: explicit restrictive policy to ensure only admins (or service_role) can insert into user_roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Revoke EXECUTE on SECURITY DEFINER trigger / internal helpers from public roles.
--    These are only invoked by triggers or server-side code; clients should not call them.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_health_record_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_easy_chat_question() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_user_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_alpha_tester(text) FROM PUBLIC, anon, authenticated;

-- has_role is referenced by RLS policies but does not need direct client invocation.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
