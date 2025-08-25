-- Create tables for Easy Chat feature
CREATE TABLE public.easy_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_question_id TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  final_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for predefined questions
CREATE TABLE public.easy_chat_questions (
  id TEXT NOT NULL PRIMARY KEY,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_question_id TEXT,
  response_leads_to JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_root BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user responses
CREATE TABLE public.easy_chat_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.easy_chat_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  response_text TEXT NOT NULL,
  response_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.easy_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easy_chat_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easy_chat_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for easy_chat_sessions
CREATE POLICY "Users can view their own easy chat sessions" 
ON public.easy_chat_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own easy chat sessions" 
ON public.easy_chat_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own easy chat sessions" 
ON public.easy_chat_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own easy chat sessions" 
ON public.easy_chat_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for easy_chat_questions (public read access)
CREATE POLICY "Everyone can read easy chat questions" 
ON public.easy_chat_questions 
FOR SELECT 
USING (true);

-- RLS Policies for easy_chat_responses
CREATE POLICY "Users can view their own easy chat responses" 
ON public.easy_chat_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.easy_chat_sessions 
  WHERE easy_chat_sessions.id = easy_chat_responses.session_id 
  AND easy_chat_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create their own easy chat responses" 
ON public.easy_chat_responses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.easy_chat_sessions 
  WHERE easy_chat_sessions.id = easy_chat_responses.session_id 
  AND easy_chat_sessions.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_easy_chat_sessions_updated_at
BEFORE UPDATE ON public.easy_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial questions for the decision tree
INSERT INTO public.easy_chat_questions (id, question_text, category, is_root, response_leads_to) VALUES
('root_start', 'What brings you here today?', 'general', true, '{
  "symptoms": "symptoms_main",
  "wellness": "wellness_main", 
  "concerns": "concerns_main",
  "check_results": "results_main",
  "none_above": "other_issues",
  "other_issues": "other_specify"
}'::jsonb),

('symptoms_main', 'What type of symptoms are you experiencing?', 'symptoms', false, '{
  "pain": "pain_location",
  "fever": "fever_details",
  "breathing": "breathing_issues", 
  "digestive": "digestive_issues",
  "skin": "skin_issues",
  "mental": "mental_health",
  "fatigue": "fatigue_details",
  "none_above": "symptoms_other",
  "other_issues": "other_specify"
}'::jsonb),

('pain_location', 'Where is your pain located?', 'pain', false, '{
  "head": "headache_details",
  "chest": "chest_pain_details",
  "abdomen": "abdominal_pain",
  "back": "back_pain_details",
  "joints": "joint_pain_details",
  "muscle": "muscle_pain_details",
  "none_above": "pain_other",
  "other_issues": "other_specify"
}'::jsonb),

('wellness_main', 'What aspect of your wellness would you like to discuss?', 'wellness', false, '{
  "prevention": "prevention_topics",
  "nutrition": "nutrition_topics",
  "exercise": "exercise_topics",
  "sleep": "sleep_topics",
  "stress": "stress_management",
  "checkup": "checkup_needed",
  "none_above": "wellness_other", 
  "other_issues": "other_specify"
}'::jsonb),

('concerns_main', 'What type of health concern do you have?', 'concerns', false, '{
  "family_history": "family_history_details",
  "medication": "medication_concerns",
  "procedure": "procedure_questions",
  "diagnosis": "diagnosis_questions",
  "lab_results": "lab_interpretation",
  "second_opinion": "second_opinion_needed",
  "none_above": "concerns_other",
  "other_issues": "other_specify"
}'::jsonb),

('other_specify', 'Please tell us more about your specific situation', 'other', false, '{
  "continue": "final_summary"
}'::jsonb),

('final_summary', 'Based on your responses, here are some topics you might want to discuss with a healthcare provider:', 'summary', false, '{}');