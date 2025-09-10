-- Fix subscribers table RLS policies to prevent unauthorized subscription modifications

-- Add INSERT policy - only service role can insert subscription records
CREATE POLICY "Only service role can insert subscriptions" 
ON public.subscribers 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Add UPDATE policy - only service role can update subscription records  
CREATE POLICY "Only service role can update subscriptions"
ON public.subscribers 
FOR UPDATE 
TO service_role 
USING (true);

-- Add DELETE policy - only service role can delete subscription records
CREATE POLICY "Only service role can delete subscriptions"
ON public.subscribers 
FOR DELETE 
TO service_role 
USING (true);