-- Create patient tokens table for HIPAA-compliant de-identification
CREATE TABLE public.patient_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  token_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.patient_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for patient tokens
CREATE POLICY "Users can view their own patient tokens" 
ON public.patient_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patient tokens" 
ON public.patient_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patient tokens" 
ON public.patient_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_patient_tokens_updated_at
BEFORE UPDATE ON public.patient_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_patient_tokens_user_patient ON public.patient_tokens(user_id, patient_id);
CREATE INDEX idx_patient_tokens_token_id ON public.patient_tokens(token_id);