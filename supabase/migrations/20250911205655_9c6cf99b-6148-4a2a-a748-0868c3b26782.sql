-- Fix critical security vulnerabilities

-- 1. Fix easy_chat_questions table - remove public access and restrict to authenticated users only
DROP POLICY IF EXISTS "Everyone can read easy chat questions" ON public.easy_chat_questions;

CREATE POLICY "Authenticated users can read easy chat questions" 
ON public.easy_chat_questions 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Fix function search_path security issues by updating all functions with proper search_path

-- Update generate_easy_chat_question function
CREATE OR REPLACE FUNCTION public.generate_easy_chat_question()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This is just a placeholder for the AI generation logic
  -- The actual generation will happen in the edge function
  RETURN NEW;
END;
$function$;

-- Update get_total_user_count function
CREATE OR REPLACE FUNCTION public.get_total_user_count()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer FROM public.profiles;
$function$;

-- Update reset_user_gems function
CREATE OR REPLACE FUNCTION public.reset_user_gems()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if it's time to reset
  IF now() >= NEW.next_reset_at THEN
    NEW.current_gems = NEW.max_gems;
    NEW.last_reset_at = now();
    NEW.next_reset_at = now() + INTERVAL '3 hours';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update log_health_record_changes function
CREATE OR REPLACE FUNCTION public.log_health_record_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update is_alpha_tester function
CREATE OR REPLACE FUNCTION public.is_alpha_tester(user_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT alpha_tester 
     FROM public.profiles 
     WHERE email = user_email), 
    false
  );
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;