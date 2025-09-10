-- Add database-level safeguards for loop prevention

-- Add request tracking table for additional monitoring
CREATE TABLE IF NOT EXISTS public.request_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  conversation_id UUID,
  patient_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN DEFAULT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.request_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own request tracking"
  ON public.request_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage request tracking"
  ON public.request_tracking
  FOR ALL
  USING (true);

-- Add constraints to prevent excessive requests
ALTER TABLE public.daily_usage_limits
ADD CONSTRAINT daily_usage_reasonable_values
CHECK (messages_used >= 0 AND messages_used <= 10000 AND tokens_used >= 0);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_request_tracking_user_created 
ON public.request_tracking(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_tracking_conversation 
ON public.request_tracking(conversation_id) 
WHERE conversation_id IS NOT NULL;