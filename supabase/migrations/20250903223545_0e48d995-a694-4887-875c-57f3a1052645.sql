-- Add missing category column to conversation_diagnoses table
ALTER TABLE public.conversation_diagnoses 
ADD COLUMN category text NOT NULL DEFAULT 'other';

-- Add index for better performance on category queries
CREATE INDEX idx_conversation_diagnoses_category ON public.conversation_diagnoses(category);

-- Update any existing records to have a proper category
UPDATE public.conversation_diagnoses 
SET category = 'other' 
WHERE category IS NULL;