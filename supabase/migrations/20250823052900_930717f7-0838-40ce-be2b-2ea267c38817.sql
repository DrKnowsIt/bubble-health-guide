-- Create health_insights table for AI-extracted important health findings
CREATE TABLE public.health_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NULL,
  health_record_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'abnormal', 'concerning', 'risk_factor', 'symptom'
  severity_level TEXT NOT NULL DEFAULT 'moderate', -- 'urgent', 'moderate', 'watch'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NULL,
  confidence_score NUMERIC(3,2) NULL, -- 0.00 to 1.00
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own health insights"
ON public.health_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health insights"
ON public.health_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health insights"
ON public.health_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health insights"
ON public.health_insights FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_health_insights_user_id ON public.health_insights(user_id);
CREATE INDEX idx_health_insights_patient_id ON public.health_insights(patient_id);
CREATE INDEX idx_health_insights_health_record_id ON public.health_insights(health_record_id);
CREATE INDEX idx_health_insights_severity_level ON public.health_insights(severity_level);
CREATE INDEX idx_health_insights_is_acknowledged ON public.health_insights(is_acknowledged);

-- Create trigger for updated_at
CREATE TRIGGER update_health_insights_updated_at
BEFORE UPDATE ON public.health_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();