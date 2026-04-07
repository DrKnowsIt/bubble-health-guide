
-- ============================================================
-- FULL SCHEMA RECREATION FOR LOVABLE CLOUD MIGRATION
-- ============================================================

-- ==================== UTILITY FUNCTIONS ====================

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

-- ==================== CORE TABLES ====================

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  medical_disclaimer_accepted BOOLEAN DEFAULT false,
  medical_disclaimer_accepted_at TIMESTAMP WITH TIME ZONE,
  alpha_tester BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Settings
CREATE TABLE public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_enabled BOOLEAN DEFAULT true,
  personalization_level TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own AI settings" ON public.ai_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own AI settings" ON public.ai_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own AI settings" ON public.ai_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_ai_settings_updated_at BEFORE UPDATE ON public.ai_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Patients
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  sex TEXT,
  relationship TEXT NOT NULL DEFAULT 'self',
  is_primary BOOLEAN DEFAULT false,
  is_pet BOOLEAN NOT NULL DEFAULT false,
  species TEXT,
  breed TEXT,
  probable_diagnoses JSONB DEFAULT '[]'::jsonb,
  location_region TEXT,
  location_country TEXT,
  location_updated_at TIMESTAMP WITH TIME ZONE,
  recent_travel_locations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own patients" ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own patients" ON public.patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own patients" ON public.patients FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_patients_user_id ON public.patients(user_id);

-- Health Episodes
CREATE TABLE public.health_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  episode_title TEXT NOT NULL,
  episode_description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  episode_type TEXT NOT NULL DEFAULT 'symptoms',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create their own health episodes" ON public.health_episodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own health episodes" ON public.health_episodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own health episodes" ON public.health_episodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health episodes" ON public.health_episodes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_health_episodes_updated_at BEFORE UPDATE ON public.health_episodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_health_episodes_patient_id ON public.health_episodes(patient_id);
CREATE INDEX idx_health_episodes_user_id ON public.health_episodes(user_id);

-- Health Records
CREATE TABLE public.health_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB,
  file_url TEXT,
  category TEXT DEFAULT 'general',
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view health records for their patients" ON public.health_records FOR SELECT USING (auth.uid() = user_id OR (patient_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.patients WHERE patients.id = health_records.patient_id AND patients.user_id = auth.uid())));
CREATE POLICY "Users can create health records for their patients" ON public.health_records FOR INSERT WITH CHECK (auth.uid() = user_id AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients WHERE patients.id = health_records.patient_id AND patients.user_id = auth.uid())));
CREATE POLICY "Users can update health records for their patients" ON public.health_records FOR UPDATE USING (auth.uid() = user_id AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients WHERE patients.id = health_records.patient_id AND patients.user_id = auth.uid())));
CREATE POLICY "Users can delete health records for their patients" ON public.health_records FOR DELETE USING (auth.uid() = user_id AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients WHERE patients.id = health_records.patient_id AND patients.user_id = auth.uid())));
CREATE TRIGGER update_health_records_updated_at BEFORE UPDATE ON public.health_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_health_records_category ON public.health_records(category);
CREATE INDEX idx_health_records_tags ON public.health_records USING GIN(tags);
CREATE INDEX idx_health_records_patient_id ON public.health_records(patient_id);
CREATE INDEX idx_health_records_user_id ON public.health_records(user_id);
CREATE INDEX idx_health_records_user_patient_updated ON public.health_records (user_id, patient_id, updated_at DESC);

-- Conversations
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  health_episode_id UUID,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_conversations_episode FOREIGN KEY (health_episode_id) REFERENCES public.health_episodes(id) ON DELETE SET NULL
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversations for their patients" ON public.conversations FOR SELECT USING (auth.uid() = user_id AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients WHERE patients.id = conversations.patient_id AND patients.user_id = auth.uid())));
CREATE POLICY "Users can create conversations for their patients" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients WHERE patients.id = conversations.patient_id AND patients.user_id = auth.uid())));
CREATE POLICY "Users can update conversations for their patients" ON public.conversations FOR UPDATE USING (auth.uid() = user_id AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients WHERE patients.id = conversations.patient_id AND patients.user_id = auth.uid())));
CREATE POLICY "Users can delete conversations for their patients" ON public.conversations FOR DELETE USING (auth.uid() = user_id AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients WHERE patients.id = conversations.patient_id AND patients.user_id = auth.uid())));
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_patient_id ON public.conversations(patient_id);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('user', 'ai', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  products JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages from their conversations" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can create messages in their conversations" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can update messages in their conversations" ON public.messages FOR UPDATE USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can delete messages from their conversations" ON public.messages FOR DELETE USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- ==================== DIAGNOSIS & ANALYSIS TABLES ====================

-- Conversation Diagnoses (legacy, kept for backward compat)
CREATE TABLE public.conversation_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis TEXT NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own conversation diagnoses" ON public.conversation_diagnoses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own conversation diagnoses" ON public.conversation_diagnoses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own conversation diagnoses" ON public.conversation_diagnoses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own conversation diagnoses" ON public.conversation_diagnoses FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_conversation_diagnoses_updated_at BEFORE UPDATE ON public.conversation_diagnoses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_conversation_diagnoses_conversation_id ON public.conversation_diagnoses(conversation_id);
CREATE INDEX idx_conversation_diagnoses_patient_id ON public.conversation_diagnoses(patient_id);
CREATE INDEX idx_conversation_diagnoses_user_id ON public.conversation_diagnoses(user_id);
CREATE INDEX idx_conversation_diagnoses_category ON public.conversation_diagnoses(category);
CREATE INDEX idx_conversation_diagnoses_conv_patient ON public.conversation_diagnoses (conversation_id, patient_id);

-- Health Topics for Discussion (modern replacement)
CREATE TABLE public.health_topics_for_discussion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  user_id UUID NOT NULL,
  health_topic TEXT NOT NULL,
  relevance_score DOUBLE PRECISION,
  reasoning TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_topics_for_discussion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create their own health topics for discussion" ON public.health_topics_for_discussion FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view their own health topics for discussion" ON public.health_topics_for_discussion FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own health topics for discussion" ON public.health_topics_for_discussion FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own health topics for discussion" ON public.health_topics_for_discussion FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_health_topics_for_discussion_updated_at BEFORE UPDATE ON public.health_topics_for_discussion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversation Memory
CREATE TABLE public.conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  user_id UUID NOT NULL,
  health_episode_id UUID,
  memory JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id),
  CONSTRAINT fk_memory_episode FOREIGN KEY (health_episode_id) REFERENCES public.health_episodes(id) ON DELETE SET NULL
);

ALTER TABLE public.conversation_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own conversation memory" ON public.conversation_memory FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own conversation memory" ON public.conversation_memory FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own conversation memory" ON public.conversation_memory FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own conversation memory" ON public.conversation_memory FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER trg_conversation_memory_updated_at BEFORE UPDATE ON public.conversation_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversation Solutions
CREATE TABLE public.conversation_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  user_id UUID NOT NULL,
  solution TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence DOUBLE PRECISION,
  reasoning TEXT,
  products JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own conversation solutions" ON public.conversation_solutions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own conversation solutions" ON public.conversation_solutions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own conversation solutions" ON public.conversation_solutions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own conversation solutions" ON public.conversation_solutions FOR DELETE USING (user_id = auth.uid());

-- Diagnosis Feedback
CREATE TABLE public.diagnosis_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  diagnosis_text TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnosis_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own diagnosis feedback" ON public.diagnosis_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own diagnosis feedback" ON public.diagnosis_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diagnosis feedback" ON public.diagnosis_feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diagnosis feedback" ON public.diagnosis_feedback FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_diagnosis_feedback_updated_at BEFORE UPDATE ON public.diagnosis_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Solution Feedback
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

ALTER TABLE public.solution_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own solution feedback" ON public.solution_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own solution feedback" ON public.solution_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own solution feedback" ON public.solution_feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own solution feedback" ON public.solution_feedback FOR DELETE USING (auth.uid() = user_id);

-- Final Medical Analysis
CREATE TABLE public.final_medical_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  analysis_summary TEXT NOT NULL,
  key_findings JSONB DEFAULT '[]'::jsonb,
  doctor_test_recommendations JSONB DEFAULT '[]'::jsonb,
  holistic_assessment TEXT,
  risk_assessment TEXT,
  clinical_insights JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC,
  data_sources_analyzed JSONB DEFAULT '{}'::jsonb,
  follow_up_recommendations TEXT[],
  priority_level TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.final_medical_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create their own final medical analysis" ON public.final_medical_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own final medical analysis" ON public.final_medical_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own final medical analysis" ON public.final_medical_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own final medical analysis" ON public.final_medical_analysis FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_final_medical_analysis_updated_at BEFORE UPDATE ON public.final_medical_analysis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== HEALTH RECORDS SUPPORT ====================

-- Health Record Summaries
CREATE TABLE public.health_record_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  health_record_id UUID NOT NULL,
  summary_text TEXT NOT NULL,
  summary_type TEXT NOT NULL DEFAULT 'ai_generated',
  priority_level TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_record_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own health record summaries" ON public.health_record_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health record summaries" ON public.health_record_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health record summaries" ON public.health_record_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health record summaries" ON public.health_record_summaries FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_health_record_summaries_updated_at BEFORE UPDATE ON public.health_record_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Doctor Notes
CREATE TABLE public.doctor_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  note_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  conversation_context JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own doctor notes" ON public.doctor_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own doctor notes" ON public.doctor_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own doctor notes" ON public.doctor_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own doctor notes" ON public.doctor_notes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_doctor_notes_updated_at BEFORE UPDATE ON public.doctor_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX doctor_notes_unique_report ON public.doctor_notes (user_id, patient_id, note_type);

-- Health Data Priorities
CREATE TABLE public.health_data_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL,
  priority_level TEXT NOT NULL,
  subscription_tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_data_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own health data priorities" ON public.health_data_priorities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health data priorities" ON public.health_data_priorities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health data priorities" ON public.health_data_priorities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health data priorities" ON public.health_data_priorities FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_health_data_priorities_updated_at BEFORE UPDATE ON public.health_data_priorities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Health Record History (audit trail)
CREATE TABLE public.health_record_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  health_record_id UUID NOT NULL,
  user_id UUID NOT NULL,
  patient_id UUID,
  change_type TEXT NOT NULL,
  previous_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_record_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own health record history" ON public.health_record_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health record history" ON public.health_record_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_health_record_history_updated_at BEFORE UPDATE ON public.health_record_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Health Insights
CREATE TABLE public.health_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NULL,
  health_record_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  severity_level TEXT NOT NULL DEFAULT 'moderate',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NULL,
  confidence_score NUMERIC(3,2) NULL,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own health insights" ON public.health_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health insights" ON public.health_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health insights" ON public.health_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health insights" ON public.health_insights FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_health_insights_updated_at BEFORE UPDATE ON public.health_insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comprehensive Health Reports
CREATE TABLE public.comprehensive_health_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  overall_health_status TEXT NOT NULL DEFAULT 'unknown',
  key_concerns TEXT[],
  recommendations TEXT[],
  priority_level TEXT NOT NULL DEFAULT 'normal',
  demographics_summary JSONB DEFAULT '{}'::jsonb,
  health_metrics_summary JSONB DEFAULT '{}'::jsonb,
  report_summary TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  recommended_tests JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comprehensive_health_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own comprehensive health reports" ON public.comprehensive_health_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own comprehensive health reports" ON public.comprehensive_health_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comprehensive health reports" ON public.comprehensive_health_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comprehensive health reports" ON public.comprehensive_health_reports FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_comprehensive_health_reports_updated_at BEFORE UPDATE ON public.comprehensive_health_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== EPISODES & DOCTOR ====================

-- Doctor Confirmations
CREATE TABLE public.doctor_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  health_episode_id UUID,
  confirmation_type TEXT NOT NULL,
  confirmed_diagnosis TEXT,
  doctor_notes TEXT,
  confidence_level TEXT NOT NULL DEFAULT 'confirmed',
  confirmation_date DATE NOT NULL,
  next_followup_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_doctor_confirmations_episode FOREIGN KEY (health_episode_id) REFERENCES public.health_episodes(id) ON DELETE CASCADE
);

ALTER TABLE public.doctor_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create their own doctor confirmations" ON public.doctor_confirmations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own doctor confirmations" ON public.doctor_confirmations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own doctor confirmations" ON public.doctor_confirmations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own doctor confirmations" ON public.doctor_confirmations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_doctor_confirmations_updated_at BEFORE UPDATE ON public.doctor_confirmations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Confirmed Medical History
CREATE TABLE public.confirmed_medical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  condition_name TEXT NOT NULL,
  diagnosis_date DATE,
  confirmed_by_doctor BOOLEAN NOT NULL DEFAULT true,
  doctor_confirmation_id UUID,
  severity TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  last_reviewed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_confirmed_history_doctor_confirmation FOREIGN KEY (doctor_confirmation_id) REFERENCES public.doctor_confirmations(id) ON DELETE SET NULL
);

ALTER TABLE public.confirmed_medical_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create their own medical history" ON public.confirmed_medical_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own medical history" ON public.confirmed_medical_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own medical history" ON public.confirmed_medical_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own medical history" ON public.confirmed_medical_history FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_confirmed_medical_history_updated_at BEFORE UPDATE ON public.confirmed_medical_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== EASY CHAT ====================

CREATE TABLE public.easy_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_question_id TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  final_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.easy_chat_questions (
  id TEXT NOT NULL PRIMARY KEY,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_question_id TEXT,
  response_leads_to JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_root BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.easy_chat_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.easy_chat_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  response_text TEXT NOT NULL,
  response_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.easy_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easy_chat_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easy_chat_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own easy chat sessions" ON public.easy_chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own easy chat sessions" ON public.easy_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own easy chat sessions" ON public.easy_chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own easy chat sessions" ON public.easy_chat_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can read easy chat questions" ON public.easy_chat_questions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own easy chat responses" ON public.easy_chat_responses FOR SELECT USING (EXISTS (SELECT 1 FROM public.easy_chat_sessions WHERE easy_chat_sessions.id = easy_chat_responses.session_id AND easy_chat_sessions.user_id = auth.uid()));
CREATE POLICY "Users can create their own easy chat responses" ON public.easy_chat_responses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.easy_chat_sessions WHERE easy_chat_sessions.id = easy_chat_responses.session_id AND easy_chat_sessions.user_id = auth.uid()));
CREATE TRIGGER update_easy_chat_sessions_updated_at BEFORE UPDATE ON public.easy_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed easy chat questions
INSERT INTO public.easy_chat_questions (id, question_text, category, is_root, response_leads_to) VALUES
('root_start', 'What brings you here today?', 'general', true, '{"symptoms": "symptoms_main", "wellness": "wellness_main", "concerns": "concerns_main", "other_issues": "other_specify"}'::jsonb),
('symptoms_main', 'What type of symptoms are you experiencing?', 'symptoms', false, '{"pain": "pain_location", "fever": "fever_details", "breathing": "breathing_issues", "digestive": "digestive_issues", "skin": "skin_issues", "mental": "mental_health", "fatigue": "fatigue_details", "other_issues": "other_specify"}'::jsonb),
('pain_location', 'Where is your pain located?', 'pain', false, '{"head": "headache_details", "chest": "chest_pain_details", "abdomen": "abdominal_pain", "back": "back_pain_details", "joints": "joint_pain_details", "muscle": "muscle_pain_details", "other_issues": "other_specify"}'::jsonb),
('wellness_main', 'What aspect of your wellness would you like to discuss?', 'wellness', false, '{"prevention": "prevention_topics", "nutrition": "nutrition_topics", "exercise": "exercise_topics", "sleep": "sleep_topics", "stress": "stress_management", "checkup": "checkup_needed", "other_issues": "other_specify"}'::jsonb),
('concerns_main', 'What type of health concern do you have?', 'concerns', false, '{"family_history": "family_history_details", "medication": "medication_concerns", "procedure": "procedure_questions", "diagnosis": "diagnosis_questions", "lab_results": "lab_interpretation", "second_opinion": "second_opinion_needed", "other_issues": "other_specify"}'::jsonb),
('other_specify', 'Please tell us more about your specific situation', 'other', false, '{"continue": "final_summary"}'::jsonb),
('final_summary', 'Based on your responses, here are some topics you might want to discuss with a healthcare provider:', 'summary', false, '{}'::jsonb);

-- Anatomy transition questions
INSERT INTO public.easy_chat_questions (id, question_text, category, is_root, response_leads_to) VALUES
('anatomy_head_start', 'What brings you to discuss your head or head area today?', 'anatomy', false, '{"pain": "head_pain_details", "headaches": "headache_type", "dizziness": "dizziness_details", "vision_issues": "vision_concerns", "hearing_issues": "hearing_concerns", "sinus_issues": "sinus_problems", "other_issues": "other_specify"}'),
('anatomy_chest_start', 'What brings you to discuss your chest area today?', 'anatomy', false, '{"pain": "chest_pain_type", "breathing": "breathing_difficulty", "heart_concerns": "heart_symptoms", "cough": "cough_details", "tightness": "chest_tightness", "other_issues": "other_specify"}'),
('anatomy_abdomen_start', 'What brings you to discuss your abdomen or stomach area today?', 'anatomy', false, '{"pain": "abdominal_pain_type", "digestive": "digestive_concerns", "nausea": "nausea_details", "bloating": "bloating_concerns", "bowel_changes": "bowel_issues", "other_issues": "other_specify"}'),
('anatomy_back_start', 'What brings you to discuss your back today?', 'anatomy', false, '{"pain": "back_pain_type", "stiffness": "back_stiffness", "muscle_tension": "muscle_issues", "mobility": "mobility_concerns", "injury": "injury_details", "other_issues": "other_specify"}'),
('anatomy_arms_start', 'What brings you to discuss your arms today?', 'anatomy', false, '{"pain": "arm_pain_details", "weakness": "arm_weakness", "numbness": "numbness_tingling", "mobility": "arm_mobility", "injury": "arm_injury", "other_issues": "other_specify"}'),
('anatomy_legs_start', 'What brings you to discuss your legs today?', 'anatomy', false, '{"pain": "leg_pain_details", "weakness": "leg_weakness", "swelling": "leg_swelling", "mobility": "leg_mobility", "circulation": "circulation_issues", "other_issues": "other_specify"}'),
('anatomy_neck_start', 'What brings you to discuss your neck today?', 'anatomy', false, '{"pain": "neck_pain_details", "stiffness": "neck_stiffness", "headaches": "neck_headaches", "mobility": "neck_mobility", "muscle_tension": "neck_tension", "other_issues": "other_specify"}');

-- ==================== SUBSCRIPTION & USAGE ====================

-- Subscribers
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscribers_email_unique UNIQUE (email)
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscription" ON public.subscribers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_subscription" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "update_own_subscription" ON public.subscribers FOR UPDATE USING (true);
CREATE TRIGGER update_subscribers_updated_at BEFORE UPDATE ON public.subscribers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Patient Tokens (HIPAA de-identification)
CREATE TABLE public.patient_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  token_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own patient tokens" ON public.patient_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own patient tokens" ON public.patient_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own patient tokens" ON public.patient_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_patient_tokens_updated_at BEFORE UPDATE ON public.patient_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_patient_tokens_user_patient ON public.patient_tokens(user_id, patient_id);
CREATE INDEX idx_patient_tokens_token_id ON public.patient_tokens(token_id);

-- AI Usage Tracking
CREATE TABLE public.ai_usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID,
  function_name TEXT NOT NULL,
  model_used TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  request_type TEXT NOT NULL,
  subscription_tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage tracking" ON public.ai_usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert usage tracking" ON public.ai_usage_tracking FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update usage tracking" ON public.ai_usage_tracking FOR UPDATE TO service_role USING (true);
CREATE TRIGGER update_ai_usage_tracking_updated_at BEFORE UPDATE ON public.ai_usage_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_ai_usage_tracking_user_date ON public.ai_usage_tracking (user_id, created_at);
CREATE INDEX idx_ai_usage_tracking_function ON public.ai_usage_tracking (function_name, created_at);

-- Daily Usage Limits
CREATE TABLE public.daily_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_used INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_incurred DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage limits" ON public.daily_usage_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage usage limits" ON public.daily_usage_limits FOR ALL TO service_role USING (true);
CREATE TRIGGER update_daily_usage_limits_updated_at BEFORE UPDATE ON public.daily_usage_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_daily_usage_limits_user_date ON public.daily_usage_limits (user_id, date);

-- User Token Limits
CREATE TABLE public.user_token_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_tokens INTEGER NOT NULL DEFAULT 0,
  limit_reached_at TIMESTAMP WITH TIME ZONE NULL,
  can_chat BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_token_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own token limits" ON public.user_token_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all token limits" ON public.user_token_limits FOR ALL USING (true);
CREATE TRIGGER update_user_token_limits_updated_at BEFORE UPDATE ON public.user_token_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== USER ROLES ====================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== HEALTH ALERTS ====================

CREATE TABLE public.health_alert_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT,
  country TEXT NOT NULL,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX health_alert_cache_location_idx ON public.health_alert_cache (country, COALESCE(region, ''));
ALTER TABLE public.health_alert_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read cached health alerts" ON public.health_alert_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage health alert cache" ON public.health_alert_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX health_alert_cache_expires_idx ON public.health_alert_cache (expires_at);

-- ==================== FUNCTIONS & TRIGGERS ====================

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, first_name, last_name, email, alpha_tester
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'alpha_tester')::boolean, false)
  );
  INSERT INTO public.ai_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Alpha tester check
CREATE OR REPLACE FUNCTION public.is_alpha_tester(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT alpha_tester FROM public.profiles WHERE email = user_email),
    false
  );
$$;

-- Total user count
CREATE OR REPLACE FUNCTION public.get_total_user_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_user_count() TO anon;

-- Health record change logging
CREATE OR REPLACE FUNCTION public.log_health_record_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.health_record_history (health_record_id, user_id, patient_id, change_type, new_data, change_reason)
    VALUES (NEW.id, NEW.user_id, NEW.patient_id, 'created', to_jsonb(NEW), 'Health record created');
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.health_record_history (health_record_id, user_id, patient_id, change_type, previous_data, new_data, changed_fields, change_reason)
      VALUES (NEW.id, NEW.user_id, NEW.patient_id, 'updated', to_jsonb(OLD), to_jsonb(NEW),
        ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) AS n(key, value) JOIN jsonb_each(to_jsonb(OLD)) AS o(key, value) ON n.key = o.key WHERE n.value IS DISTINCT FROM o.value),
        'Health record updated');
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.health_record_history (health_record_id, user_id, patient_id, change_type, previous_data, change_reason)
    VALUES (OLD.id, OLD.user_id, OLD.patient_id, 'deleted', to_jsonb(OLD), 'Health record deleted');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER log_health_record_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.health_records
FOR EACH ROW EXECUTE FUNCTION public.log_health_record_changes();

-- Placeholder for easy chat question generation
CREATE OR REPLACE FUNCTION public.generate_easy_chat_question()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- ==================== REALTIME ====================

ALTER TABLE public.conversation_diagnoses REPLICA IDENTITY FULL;
ALTER TABLE public.health_topics_for_discussion REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_solutions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_diagnoses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_topics_for_discussion;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_solutions;
