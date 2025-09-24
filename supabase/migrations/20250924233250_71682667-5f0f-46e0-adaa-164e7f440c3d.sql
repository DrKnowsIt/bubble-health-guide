-- Drop the existing user_gems table and related functions
DROP TABLE IF EXISTS public.user_gems CASCADE;
DROP FUNCTION IF EXISTS public.reset_user_gems() CASCADE;

-- Create the new token-based limiting table
CREATE TABLE public.user_token_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_tokens INTEGER NOT NULL DEFAULT 0,
  limit_reached_at TIMESTAMP WITH TIME ZONE NULL,
  can_chat BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_token_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own token limits" 
ON public.user_token_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all token limits" 
ON public.user_token_limits 
FOR ALL 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_user_token_limits_updated_at
BEFORE UPDATE ON public.user_token_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();