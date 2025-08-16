-- Fix search path for security definer functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Also fix the existing handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  INSERT INTO public.ai_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;