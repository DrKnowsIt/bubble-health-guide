-- Create user_gems table to replace daily_usage_limits
CREATE TABLE public.user_gems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_gems INTEGER NOT NULL DEFAULT 0,
  max_gems INTEGER NOT NULL DEFAULT 50,
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '3 hours'),
  subscription_tier TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_gems ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own gems" 
ON public.user_gems 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage gems" 
ON public.user_gems 
FOR ALL 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_user_gems_updated_at
  BEFORE UPDATE ON public.user_gems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to reset gems every 3 hours
CREATE OR REPLACE FUNCTION public.reset_user_gems()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if it's time to reset
  IF now() >= NEW.next_reset_at THEN
    NEW.current_gems = NEW.max_gems;
    NEW.last_reset_at = now();
    NEW.next_reset_at = now() + INTERVAL '3 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-reset gems
CREATE TRIGGER auto_reset_gems
  BEFORE UPDATE ON public.user_gems
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_user_gems();

-- Seed gems for existing users based on subscription tier
INSERT INTO public.user_gems (user_id, current_gems, max_gems, subscription_tier)
SELECT 
  p.user_id,
  CASE 
    WHEN COALESCE(s.subscription_tier, 'basic') = 'basic' THEN 50
    WHEN s.subscription_tier = 'pro' THEN 200
    WHEN s.subscription_tier = 'enterprise' THEN 500
    ELSE 50
  END as current_gems,
  CASE 
    WHEN COALESCE(s.subscription_tier, 'basic') = 'basic' THEN 50
    WHEN s.subscription_tier = 'pro' THEN 200
    WHEN s.subscription_tier = 'enterprise' THEN 500
    ELSE 50
  END as max_gems,
  COALESCE(s.subscription_tier, 'basic') as subscription_tier
FROM public.profiles p
LEFT JOIN public.subscribers s ON p.user_id = s.user_id
ON CONFLICT (user_id) DO NOTHING;