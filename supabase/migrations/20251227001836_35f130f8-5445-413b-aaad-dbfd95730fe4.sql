-- Fix search_path for all security definer functions to prevent search path injection attacks

-- Fix generate_easy_chat_question
CREATE OR REPLACE FUNCTION public.generate_easy_chat_question()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is just a placeholder for the AI generation logic
  -- The actual generation will happen in the edge function
  RETURN NEW;
END;
$$;

-- Fix get_total_user_count
CREATE OR REPLACE FUNCTION public.get_total_user_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.profiles;
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with alpha_tester status from metadata
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name,
    email,
    alpha_tester
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'alpha_tester')::boolean, false)
  );
  
  -- Insert AI settings for the new user
  INSERT INTO public.ai_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Fix is_alpha_tester
CREATE OR REPLACE FUNCTION public.is_alpha_tester(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT alpha_tester 
     FROM public.profiles 
     WHERE email = user_email), 
    false
  );
$$;

-- Fix log_health_record_changes
CREATE OR REPLACE FUNCTION public.log_health_record_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;