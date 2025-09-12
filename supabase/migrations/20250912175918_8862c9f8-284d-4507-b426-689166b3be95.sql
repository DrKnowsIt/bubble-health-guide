-- Add products column to conversation_solutions table to store Amazon product data
ALTER TABLE public.conversation_solutions 
ADD COLUMN products JSONB DEFAULT '[]'::jsonb;