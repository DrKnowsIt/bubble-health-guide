-- Create diagnosis tracking table for conversations
CREATE TABLE IF NOT EXISTS public.conversation_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis TEXT NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_diagnoses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own conversation diagnoses" 
ON public.conversation_diagnoses 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversation diagnoses" 
ON public.conversation_diagnoses 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversation diagnoses" 
ON public.conversation_diagnoses 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversation diagnoses" 
ON public.conversation_diagnoses 
FOR DELETE 
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_conversation_diagnoses_updated_at
  BEFORE UPDATE ON public.conversation_diagnoses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint to subscribers email
ALTER TABLE public.subscribers 
ADD CONSTRAINT subscribers_email_unique UNIQUE (email);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_diagnoses_conversation_id ON public.conversation_diagnoses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_diagnoses_patient_id ON public.conversation_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversation_diagnoses_user_id ON public.conversation_diagnoses(user_id);