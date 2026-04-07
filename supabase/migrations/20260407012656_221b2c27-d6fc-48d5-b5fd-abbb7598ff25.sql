
-- Fix subscribers: restrict insert/update to service_role only
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

CREATE POLICY "Service role can insert subscriptions" ON public.subscribers FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update subscriptions" ON public.subscribers FOR UPDATE TO service_role USING (true);

-- Fix user_token_limits: restrict management to service_role only
DROP POLICY IF EXISTS "Service role can manage all token limits" ON public.user_token_limits;

CREATE POLICY "Service role can manage all token limits" ON public.user_token_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
