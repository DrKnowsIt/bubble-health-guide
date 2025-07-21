-- Add medical disclaimer acceptance tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN medical_disclaimer_accepted BOOLEAN DEFAULT false,
ADD COLUMN medical_disclaimer_accepted_at TIMESTAMP WITH TIME ZONE;