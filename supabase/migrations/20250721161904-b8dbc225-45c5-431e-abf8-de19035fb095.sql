-- Add probable_diagnoses column to patients table to store AI diagnostic guesses
ALTER TABLE public.patients 
ADD COLUMN probable_diagnoses JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public.patients.probable_diagnoses IS 'Array of probable diagnoses with structure: [{"diagnosis": "condition name", "confidence": 0.85, "reasoning": "explanation", "updated_at": "timestamp"}]';