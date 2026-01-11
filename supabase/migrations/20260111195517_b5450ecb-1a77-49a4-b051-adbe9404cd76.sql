-- Add location columns to patients table for health alerts
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS location_region TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recent_travel_locations JSONB DEFAULT '[]'::jsonb;

-- Create health alert cache table
CREATE TABLE IF NOT EXISTS public.health_alert_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT,
  country TEXT NOT NULL,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for region/country combination
CREATE UNIQUE INDEX IF NOT EXISTS health_alert_cache_location_idx 
ON public.health_alert_cache (country, COALESCE(region, ''));

-- Enable RLS on health_alert_cache
ALTER TABLE public.health_alert_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cached alerts
CREATE POLICY "Users can read cached health alerts" 
ON public.health_alert_cache 
FOR SELECT 
TO authenticated
USING (true);

-- Allow service role to manage cache (for edge functions)
CREATE POLICY "Service role can manage health alert cache" 
ON public.health_alert_cache 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add index for expiry cleanup
CREATE INDEX IF NOT EXISTS health_alert_cache_expires_idx 
ON public.health_alert_cache (expires_at);