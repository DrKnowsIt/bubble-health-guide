-- Phase 1: Database Schema Extensions

-- Create table for health record summaries
CREATE TABLE public.health_record_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  health_record_id UUID NOT NULL,
  summary_text TEXT NOT NULL,
  summary_type TEXT NOT NULL DEFAULT 'ai_generated',
  priority_level TEXT NOT NULL DEFAULT 'normal', -- 'always', 'conditional', 'normal'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for doctor notes (AI persistent memory)
CREATE TABLE public.doctor_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  note_type TEXT NOT NULL, -- 'pattern', 'concern', 'preference', 'insight'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  conversation_context JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for health data priority configuration
CREATE TABLE public.health_data_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL, -- 'demographics', 'vitals', 'family_history', 'dna', 'lifestyle', etc.
  priority_level TEXT NOT NULL, -- 'always', 'conditional', 'minimal'
  subscription_tier TEXT, -- null means applies to all tiers
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, data_type, subscription_tier)
);

-- Create table for AI conversation strategies
CREATE TABLE public.ai_conversation_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strategy_name TEXT NOT NULL,
  strategy_config JSONB NOT NULL DEFAULT '{}',
  subscription_tier TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.health_record_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_data_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_strategies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for health_record_summaries
CREATE POLICY "Users can view their own record summaries" 
ON public.health_record_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own record summaries" 
ON public.health_record_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own record summaries" 
ON public.health_record_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own record summaries" 
ON public.health_record_summaries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for doctor_notes
CREATE POLICY "Users can view their own doctor notes" 
ON public.doctor_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own doctor notes" 
ON public.doctor_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doctor notes" 
ON public.doctor_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doctor notes" 
ON public.doctor_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for health_data_priorities
CREATE POLICY "Users can view their own data priorities" 
ON public.health_data_priorities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own data priorities" 
ON public.health_data_priorities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data priorities" 
ON public.health_data_priorities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data priorities" 
ON public.health_data_priorities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for ai_conversation_strategies
CREATE POLICY "Users can view their own conversation strategies" 
ON public.ai_conversation_strategies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation strategies" 
ON public.ai_conversation_strategies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation strategies" 
ON public.ai_conversation_strategies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation strategies" 
ON public.ai_conversation_strategies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.health_record_summaries 
ADD CONSTRAINT fk_health_record_summaries_health_record_id 
FOREIGN KEY (health_record_id) REFERENCES public.health_records(id) ON DELETE CASCADE;

-- Create triggers for updated_at columns
CREATE TRIGGER update_health_record_summaries_updated_at
BEFORE UPDATE ON public.health_record_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_notes_updated_at
BEFORE UPDATE ON public.doctor_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_data_priorities_updated_at
BEFORE UPDATE ON public.health_data_priorities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversation_strategies_updated_at
BEFORE UPDATE ON public.ai_conversation_strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default health data priorities for new users
INSERT INTO public.health_data_priorities (user_id, data_type, priority_level, subscription_tier) 
SELECT 
  id as user_id,
  data_type,
  priority_level,
  subscription_tier
FROM (
  SELECT id FROM auth.users
) users
CROSS JOIN (
  VALUES 
    ('demographics', 'always', null),
    ('vitals', 'always', null),
    ('family_history', 'always', null),
    ('recent_trauma', 'always', null),
    ('dna', 'conditional', 'basic'),
    ('dna', 'always', 'pro'),
    ('detailed_forms', 'conditional', 'basic'),
    ('detailed_forms', 'always', 'pro'),
    ('lifestyle', 'conditional', null),
    ('medications', 'always', null),
    ('allergies', 'always', null)
) as priorities(data_type, priority_level, subscription_tier)
ON CONFLICT (user_id, data_type, subscription_tier) DO NOTHING;