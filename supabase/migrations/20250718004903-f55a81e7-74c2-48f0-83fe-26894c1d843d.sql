-- Add new columns to health_records table for better categorization
ALTER TABLE public.health_records 
ADD COLUMN category TEXT DEFAULT 'general',
ADD COLUMN metadata JSONB DEFAULT '{}',
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX idx_health_records_category ON public.health_records(category);
CREATE INDEX idx_health_records_tags ON public.health_records USING GIN(tags);

-- Add trigger for updated_at
CREATE TRIGGER update_health_records_updated_at
BEFORE UPDATE ON public.health_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();