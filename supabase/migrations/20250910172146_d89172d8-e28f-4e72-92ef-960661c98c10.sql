-- Create usage tracking table to monitor AI calls and costs
CREATE TABLE public.ai_usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  function_name TEXT NOT NULL,
  model_used TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  request_type TEXT NOT NULL, -- 'chat', 'analysis', 'diagnosis', 'summary', etc.
  subscription_tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage tracking" 
ON public.ai_usage_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage tracking" 
ON public.ai_usage_tracking 
FOR INSERT 
TO service_role 
WITH CHECK (true);

CREATE POLICY "Service role can update usage tracking" 
ON public.ai_usage_tracking 
FOR UPDATE 
TO service_role 
USING (true);

-- Create daily usage limits table
CREATE TABLE public.daily_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_used INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_incurred DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage limits" 
ON public.daily_usage_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage limits" 
ON public.daily_usage_limits 
FOR ALL 
TO service_role 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_ai_usage_tracking_user_date ON public.ai_usage_tracking (user_id, created_at);
CREATE INDEX idx_ai_usage_tracking_function ON public.ai_usage_tracking (function_name, created_at);
CREATE INDEX idx_daily_usage_limits_user_date ON public.daily_usage_limits (user_id, date);

-- Create trigger for updating timestamps
CREATE TRIGGER update_ai_usage_tracking_updated_at
BEFORE UPDATE ON public.ai_usage_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_usage_limits_updated_at
BEFORE UPDATE ON public.daily_usage_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();