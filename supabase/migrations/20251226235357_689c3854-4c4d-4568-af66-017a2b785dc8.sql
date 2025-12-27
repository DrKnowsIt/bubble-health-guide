-- Phase 1: Create user roles system for proper access control
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 3: Add database indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_patient_id ON public.health_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_records_user_id ON public.health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient_id ON public.conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_health_episodes_patient_id ON public.health_episodes(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_episodes_user_id ON public.health_episodes(user_id);

-- Fix easy_chat_questions RLS policy to require authentication
DROP POLICY IF EXISTS "Authenticated users can read easy chat questions" ON public.easy_chat_questions;
CREATE POLICY "Authenticated users can read easy chat questions"
ON public.easy_chat_questions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add trigger for user_roles updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();