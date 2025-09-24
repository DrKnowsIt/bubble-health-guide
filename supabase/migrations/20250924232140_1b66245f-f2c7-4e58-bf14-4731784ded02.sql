-- Add sex column to patients table for biological sex tracking
ALTER TABLE public.patients 
ADD COLUMN sex text;