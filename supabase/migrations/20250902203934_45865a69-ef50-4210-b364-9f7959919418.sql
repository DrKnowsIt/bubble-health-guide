-- Create final_medical_analysis table to store comprehensive AI analysis
CREATE TABLE public.final_medical_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  analysis_summary TEXT NOT NULL,
  key_findings JSONB DEFAULT '[]'::jsonb,
  doctor_test_recommendations JSONB DEFAULT '[]'::jsonb,
  holistic_assessment TEXT,
  risk_assessment TEXT,
  clinical_insights JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC,
  data_sources_analyzed JSONB DEFAULT '{}'::jsonb,
  follow_up_recommendations TEXT[],
  priority_level TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.final_medical_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can create their own final medical analysis" 
ON public.final_medical_analysis 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own final medical analysis" 
ON public.final_medical_analysis 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own final medical analysis" 
ON public.final_medical_analysis 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own final medical analysis" 
ON public.final_medical_analysis 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_final_medical_analysis_updated_at
BEFORE UPDATE ON public.final_medical_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();