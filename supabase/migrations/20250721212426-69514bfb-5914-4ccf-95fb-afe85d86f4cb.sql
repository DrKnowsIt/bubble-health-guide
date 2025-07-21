-- Create table to store diagnosis feedback
CREATE TABLE public.diagnosis_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  diagnosis_text TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.diagnosis_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own diagnosis feedback" 
ON public.diagnosis_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diagnosis feedback" 
ON public.diagnosis_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagnosis feedback" 
ON public.diagnosis_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diagnosis feedback" 
ON public.diagnosis_feedback 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_diagnosis_feedback_updated_at
BEFORE UPDATE ON public.diagnosis_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();