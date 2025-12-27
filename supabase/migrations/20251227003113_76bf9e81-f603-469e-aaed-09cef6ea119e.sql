-- Fix subscribers table SELECT policy to only use user_id (remove email path)
-- This prevents potential cross-user data leakage

DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;

CREATE POLICY "Users can view their own subscription" 
ON public.subscribers 
FOR SELECT 
USING (auth.uid() = user_id);