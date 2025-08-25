-- Create conversation_solutions table for holistic solution suggestions
CREATE TABLE public.conversation_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  user_id UUID NOT NULL,
  solution TEXT NOT NULL,
  category TEXT NOT NULL, -- lifestyle, stress, sleep, nutrition, exercise, mental_health
  confidence DOUBLE PRECISION,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_solutions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own conversation solutions" 
ON public.conversation_solutions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversation solutions" 
ON public.conversation_solutions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversation solutions" 
ON public.conversation_solutions 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversation solutions" 
ON public.conversation_solutions 
FOR DELETE 
USING (user_id = auth.uid());

-- Create solution_feedback table for user feedback on solutions
CREATE TABLE public.solution_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  solution_text TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, patient_id, solution_text)
);

-- Enable RLS
ALTER TABLE public.solution_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for solution feedback
CREATE POLICY "Users can view their own solution feedback" 
ON public.solution_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own solution feedback" 
ON public.solution_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solution feedback" 
ON public.solution_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solution feedback" 
ON public.solution_feedback 
FOR DELETE 
USING (auth.uid() = user_id);