-- Fix any potential constraint issues in conversation_diagnoses table
-- Check if there are any problematic constraints and fix them

-- First, let's see the current structure
-- If there's an issue with the category column constraint, we'll fix it

-- Remove any problematic check constraints on category if they exist
ALTER TABLE conversation_diagnoses DROP CONSTRAINT IF EXISTS conversation_diagnoses_category_check;

-- Add a more flexible constraint for category
ALTER TABLE conversation_diagnoses 
ADD CONSTRAINT conversation_diagnoses_category_check 
CHECK (category IN ('symptom', 'condition', 'diagnosis', 'other', 'general', 'specific'));

-- Ensure the diagnosis column allows longer text
ALTER TABLE conversation_diagnoses 
ALTER COLUMN diagnosis TYPE text;

-- Ensure reasoning column allows longer text
ALTER TABLE conversation_diagnoses 
ALTER COLUMN reasoning TYPE text;