-- Create comprehensive health reports table
CREATE TABLE public.comprehensive_health_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  overall_health_status TEXT NOT NULL DEFAULT 'unknown',
  key_concerns TEXT[],
  recommendations TEXT[],
  priority_level TEXT NOT NULL DEFAULT 'normal',
  demographics_summary JSONB DEFAULT '{}'::jsonb,
  health_metrics_summary JSONB DEFAULT '{}'::jsonb,
  report_summary TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comprehensive_health_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own comprehensive health reports" 
ON public.comprehensive_health_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comprehensive health reports" 
ON public.comprehensive_health_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comprehensive health reports" 
ON public.comprehensive_health_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comprehensive health reports" 
ON public.comprehensive_health_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_comprehensive_health_reports_updated_at
BEFORE UPDATE ON public.comprehensive_health_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();