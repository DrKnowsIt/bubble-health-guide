-- Fix security vulnerability in user_gems table RLS policies
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Service role can manage gems" ON public.user_gems;
DROP POLICY IF EXISTS "Users can view their own gems" ON public.user_gems;

-- Create secure RLS policies that properly restrict access
-- Allow service role to manage gems (backend operations only)
CREATE POLICY "Service role can manage all gems" 
ON public.user_gems 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to view only their own gems
CREATE POLICY "Users can view their own gems" 
ON public.user_gems 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow service role to insert/update gems (for gem management functions)
CREATE POLICY "Service role can modify gems" 
ON public.user_gems 
FOR ALL 
TO service_role;

-- Ensure RLS is enabled (should already be enabled)
ALTER TABLE public.user_gems ENABLE ROW LEVEL SECURITY;