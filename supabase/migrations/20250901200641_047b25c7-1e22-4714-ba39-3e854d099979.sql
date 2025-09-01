-- Add recommended_tests column to comprehensive_health_reports table
ALTER TABLE public.comprehensive_health_reports 
ADD COLUMN recommended_tests JSONB DEFAULT '[]'::jsonb;