-- Create patients table for multi-patient support
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- References the account owner
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  relationship TEXT NOT NULL DEFAULT 'self', -- self, spouse, child, parent, etc.
  is_primary BOOLEAN DEFAULT false, -- One primary patient per user
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on patients table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policies for patients table
CREATE POLICY "Users can view their own patients" 
ON public.patients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients" 
ON public.patients 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients" 
ON public.patients 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add patient_id to health_records table
ALTER TABLE public.health_records 
ADD COLUMN patient_id UUID;

-- Add foreign key constraint for patient_id
-- Note: We don't add NOT NULL constraint yet to allow existing records
-- Users will need to assign existing records to patients

-- Add patient_id to conversations table
ALTER TABLE public.conversations 
ADD COLUMN patient_id UUID;

-- Create index for better performance
CREATE INDEX idx_health_records_patient_id ON public.health_records(patient_id);
CREATE INDEX idx_conversations_patient_id ON public.conversations(patient_id);
CREATE INDEX idx_patients_user_id ON public.patients(user_id);

-- Update RLS policies for health_records to include patient access
DROP POLICY "Users can view their own health records" ON public.health_records;
DROP POLICY "Users can create their own health records" ON public.health_records;
DROP POLICY "Users can update their own health records" ON public.health_records;
DROP POLICY "Users can delete their own health records" ON public.health_records;

-- New policies that check both user ownership and patient ownership
CREATE POLICY "Users can view health records for their patients" 
ON public.health_records 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = health_records.patient_id 
    AND patients.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create health records for their patients" 
ON public.health_records 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  (patient_id IS NULL OR EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = health_records.patient_id 
    AND patients.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update health records for their patients" 
ON public.health_records 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  (patient_id IS NULL OR EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = health_records.patient_id 
    AND patients.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete health records for their patients" 
ON public.health_records 
FOR DELETE 
USING (
  auth.uid() = user_id AND 
  (patient_id IS NULL OR EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = health_records.patient_id 
    AND patients.user_id = auth.uid()
  ))
);

-- Update RLS policies for conversations to include patient access
DROP POLICY "Users can view their own conversations" ON public.conversations;
DROP POLICY "Users can create their own conversations" ON public.conversations;
DROP POLICY "Users can update their own conversations" ON public.conversations;
DROP POLICY "Users can delete their own conversations" ON public.conversations;

CREATE POLICY "Users can view conversations for their patients" 
ON public.conversations 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  (patient_id IS NULL OR EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = conversations.patient_id 
    AND patients.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create conversations for their patients" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  (patient_id IS NULL OR EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = conversations.patient_id 
    AND patients.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update conversations for their patients" 
ON public.conversations 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  (patient_id IS NULL OR EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = conversations.patient_id 
    AND patients.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete conversations for their patients" 
ON public.conversations 
FOR DELETE 
USING (
  auth.uid() = user_id AND 
  (patient_id IS NULL OR EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = conversations.patient_id 
    AND patients.user_id = auth.uid()
  ))
);