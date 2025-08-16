-- Create health record history table for tracking changes
CREATE TABLE public.health_record_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  health_record_id UUID NOT NULL,
  user_id UUID NOT NULL,
  patient_id UUID,
  change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  previous_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.health_record_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own health record history" 
ON public.health_record_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health record history" 
ON public.health_record_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_health_record_history_updated_at
BEFORE UPDATE ON public.health_record_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically log health record changes
CREATE OR REPLACE FUNCTION public.log_health_record_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.health_record_history (
      health_record_id,
      user_id,
      patient_id,
      change_type,
      new_data,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.patient_id,
      'created',
      to_jsonb(NEW),
      'Health record created'
    );
    RETURN NEW;
  END IF;

  -- Log UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Only log if there are actual changes
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.health_record_history (
        health_record_id,
        user_id,
        patient_id,
        change_type,
        previous_data,
        new_data,
        changed_fields,
        change_reason
      ) VALUES (
        NEW.id,
        NEW.user_id,
        NEW.patient_id,
        'updated',
        to_jsonb(OLD),
        to_jsonb(NEW),
        ARRAY(
          SELECT key 
          FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
          JOIN jsonb_each(to_jsonb(OLD)) AS o(key, value) ON n.key = o.key
          WHERE n.value IS DISTINCT FROM o.value
        ),
        'Health record updated'
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Log DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.health_record_history (
      health_record_id,
      user_id,
      patient_id,
      change_type,
      previous_data,
      change_reason
    ) VALUES (
      OLD.id,
      OLD.user_id,
      OLD.patient_id,
      'deleted',
      to_jsonb(OLD),
      'Health record deleted'
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log health record changes
CREATE TRIGGER log_health_record_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.health_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_health_record_changes();