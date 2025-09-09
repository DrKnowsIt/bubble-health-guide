-- Create Health Episodes table for distinct medical events/periods
CREATE TABLE public.health_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  episode_title TEXT NOT NULL,
  episode_description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  episode_type TEXT NOT NULL DEFAULT 'symptoms',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Doctor Confirmations table for doctor-verified information
CREATE TABLE public.doctor_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  health_episode_id UUID,
  confirmation_type TEXT NOT NULL,
  confirmed_diagnosis TEXT,
  doctor_notes TEXT,
  confidence_level TEXT NOT NULL DEFAULT 'confirmed',
  confirmation_date DATE NOT NULL,
  next_followup_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Confirmed Medical History table for doctor-verified conditions
CREATE TABLE public.confirmed_medical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  condition_name TEXT NOT NULL,
  diagnosis_date DATE,
  confirmed_by_doctor BOOLEAN NOT NULL DEFAULT true,
  doctor_confirmation_id UUID,
  severity TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  last_reviewed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.health_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmed_medical_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_episodes
CREATE POLICY "Users can create their own health episodes"
ON public.health_episodes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own health episodes"
ON public.health_episodes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own health episodes"
ON public.health_episodes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health episodes"
ON public.health_episodes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for doctor_confirmations
CREATE POLICY "Users can create their own doctor confirmations"
ON public.doctor_confirmations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own doctor confirmations"
ON public.doctor_confirmations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own doctor confirmations"
ON public.doctor_confirmations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doctor confirmations"
ON public.doctor_confirmations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for confirmed_medical_history
CREATE POLICY "Users can create their own medical history"
ON public.confirmed_medical_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own medical history"
ON public.confirmed_medical_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical history"
ON public.confirmed_medical_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical history"
ON public.confirmed_medical_history FOR DELETE
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.doctor_confirmations 
ADD CONSTRAINT fk_doctor_confirmations_episode 
FOREIGN KEY (health_episode_id) REFERENCES public.health_episodes(id) ON DELETE CASCADE;

ALTER TABLE public.confirmed_medical_history 
ADD CONSTRAINT fk_confirmed_history_doctor_confirmation 
FOREIGN KEY (doctor_confirmation_id) REFERENCES public.doctor_confirmations(id) ON DELETE SET NULL;

-- Add episode_id to conversations table to link conversations to episodes
ALTER TABLE public.conversations ADD COLUMN health_episode_id UUID;

-- Add foreign key constraint for conversations
ALTER TABLE public.conversations 
ADD CONSTRAINT fk_conversations_episode 
FOREIGN KEY (health_episode_id) REFERENCES public.health_episodes(id) ON DELETE SET NULL;

-- Add episode_id to conversation_memory table for episode-isolated memory
ALTER TABLE public.conversation_memory ADD COLUMN health_episode_id UUID;

-- Add foreign key constraint for conversation_memory
ALTER TABLE public.conversation_memory 
ADD CONSTRAINT fk_memory_episode 
FOREIGN KEY (health_episode_id) REFERENCES public.health_episodes(id) ON DELETE SET NULL;

-- Add updated_at triggers
CREATE TRIGGER update_health_episodes_updated_at
BEFORE UPDATE ON public.health_episodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_confirmations_updated_at
BEFORE UPDATE ON public.doctor_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_confirmed_medical_history_updated_at
BEFORE UPDATE ON public.confirmed_medical_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();