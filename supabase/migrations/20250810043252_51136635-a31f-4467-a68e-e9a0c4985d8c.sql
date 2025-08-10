-- Create table for per-conversation AI memory
CREATE TABLE IF NOT EXISTS public.conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  user_id UUID NOT NULL,
  memory JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id)
);

-- Enable RLS
ALTER TABLE public.conversation_memory ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own conversation memory"
ON public.conversation_memory
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own conversation memory"
ON public.conversation_memory
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversation memory"
ON public.conversation_memory
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversation memory"
ON public.conversation_memory
FOR DELETE
USING (user_id = auth.uid());

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversation_memory_updated_at ON public.conversation_memory;
CREATE TRIGGER trg_conversation_memory_updated_at
BEFORE UPDATE ON public.conversation_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();