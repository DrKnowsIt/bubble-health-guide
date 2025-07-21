-- Remove conversation_history_limit column from ai_settings table
ALTER TABLE public.ai_settings DROP COLUMN IF EXISTS conversation_history_limit;