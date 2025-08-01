-- Update subscribers table to remove 'free' as default tier
ALTER TABLE public.subscribers 
ALTER COLUMN subscription_tier SET DEFAULT NULL;

-- Update existing 'free' tier records to NULL (unsubscribed state)
UPDATE public.subscribers 
SET subscription_tier = NULL, subscribed = false 
WHERE subscription_tier = 'free';