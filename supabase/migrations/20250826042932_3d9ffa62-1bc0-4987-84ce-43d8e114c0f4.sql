-- Add is_pet field to patients table to distinguish between humans and pets
ALTER TABLE public.patients ADD COLUMN is_pet boolean NOT NULL DEFAULT false;

-- Add species field for pets (optional, can be null for humans)
ALTER TABLE public.patients ADD COLUMN species text;

-- Add breed field for pets (optional, can be null for humans)  
ALTER TABLE public.patients ADD COLUMN breed text;