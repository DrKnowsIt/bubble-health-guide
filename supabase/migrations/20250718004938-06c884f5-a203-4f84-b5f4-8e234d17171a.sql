-- Add new columns to health_records table for better categorization
ALTER TABLE public.health_records 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_records_category ON public.health_records(category);
CREATE INDEX IF NOT EXISTS idx_health_records_tags ON public.health_records USING GIN(tags);