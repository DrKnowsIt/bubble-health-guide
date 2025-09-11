-- Phase 1: Rename conversation_diagnoses table to health_topics_for_discussion
-- This change removes medical diagnosis language from the database schema

-- Create the new health_topics_for_discussion table with updated terminology
CREATE TABLE public.health_topics_for_discussion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  user_id UUID NOT NULL,
  health_topic TEXT NOT NULL, -- Changed from 'diagnosis' to 'health_topic'
  relevance_score DOUBLE PRECISION, -- Changed from 'confidence' to 'relevance_score'
  reasoning TEXT,
  category TEXT NOT NULL DEFAULT 'other'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.health_topics_for_discussion ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using the same logic as the original table
CREATE POLICY "Users can create their own health topics for discussion" 
ON public.health_topics_for_discussion 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own health topics for discussion" 
ON public.health_topics_for_discussion 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own health topics for discussion" 
ON public.health_topics_for_discussion 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own health topics for discussion" 
ON public.health_topics_for_discussion 
FOR DELETE 
USING (user_id = auth.uid());

-- Migrate existing data from conversation_diagnoses to health_topics_for_discussion
INSERT INTO public.health_topics_for_discussion (
  id, conversation_id, patient_id, user_id, 
  health_topic, relevance_score, reasoning, category, 
  created_at, updated_at
)
SELECT 
  id, conversation_id, patient_id, user_id,
  diagnosis as health_topic, confidence as relevance_score, reasoning, category,
  created_at, updated_at
FROM public.conversation_diagnoses;

-- Create updated triggers for the new table
CREATE TRIGGER update_health_topics_for_discussion_updated_at
BEFORE UPDATE ON public.health_topics_for_discussion
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Note: We'll keep the old table temporarily for backward compatibility
-- and drop it in a future migration once all code is updated