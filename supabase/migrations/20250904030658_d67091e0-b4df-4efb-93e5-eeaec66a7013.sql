-- Create a fake test user account with sample data
-- Note: This creates a test user in the auth.users table and associated profile/patient data

-- First, insert a test user into auth.users (this bypasses normal signup flow)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_sso_user
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'test@example.com',
  '$2a$10$example_encrypted_password_hash',
  now(),
  now(),
  now(),
  '{"first_name": "John", "last_name": "Doe"}'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- Create profile for the test user
INSERT INTO public.profiles (
  id,
  user_id,
  first_name,
  last_name,
  email,
  date_of_birth,
  medical_disclaimer_accepted,
  medical_disclaimer_accepted_at,
  alpha_tester,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'John',
  'Doe',
  'test@example.com',
  '1985-06-15'::date,
  true,
  now(),
  false,
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;

-- Create AI settings for the test user
INSERT INTO public.ai_settings (
  user_id,
  memory_enabled,
  personalization_level,
  created_at,
  updated_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  true,
  'medium',
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;

-- Create primary patient (self)
INSERT INTO public.patients (
  id,
  user_id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  relationship,
  is_primary,
  is_pet,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'John',
  'Doe',
  '1985-06-15'::date,
  'male',
  'self',
  true,
  false,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create a family member patient
INSERT INTO public.patients (
  id,
  user_id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  relationship,
  is_primary,
  is_pet,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'Jane',
  'Doe',
  '1990-08-22'::date,
  'female',
  'spouse',
  false,
  false,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create a pet patient
INSERT INTO public.patients (
  id,
  user_id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  relationship,
  is_primary,
  is_pet,
  species,
  breed,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'Max',
  'Doe',
  '2020-03-10'::date,
  'male',
  'pet',
  false,
  true,
  'dog',
  'Golden Retriever',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create sample health records
INSERT INTO public.health_records (
  id,
  user_id,
  patient_id,
  title,
  record_type,
  category,
  data,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Annual Checkup 2024',
  'medical_report',
  'general',
  '{"blood_pressure": "120/80", "heart_rate": "72 bpm", "weight": "175 lbs", "height": "6ft", "notes": "Normal annual checkup, all vitals within normal range"}'::jsonb,
  now(),
  now()
),
(
  gen_random_uuid(),
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Blood Work Results',
  'lab_results',
  'laboratory',
  '{"cholesterol": "185 mg/dL", "glucose": "95 mg/dL", "hemoglobin": "14.5 g/dL", "notes": "All levels within normal ranges"}'::jsonb,
  now() - interval '1 month',
  now() - interval '1 month'
),
(
  gen_random_uuid(),
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'Max Veterinary Checkup',
  'veterinary_report',
  'general',
  '{"weight": "65 lbs", "temperature": "101.5°F", "vaccinations": "up to date", "notes": "Healthy dog, regular exercise recommended"}'::jsonb,
  now() - interval '2 weeks',
  now() - interval '2 weeks'
);

-- Create sample conversations
INSERT INTO public.conversations (
  id,
  user_id,
  patient_id,
  title,
  created_at,
  updated_at
) VALUES 
(
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Headache and Fatigue Discussion',
  now() - interval '3 days',
  now() - interval '3 days'
),
(
  '660e8400-e29b-41d4-a716-446655440001'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Jane Pregnancy Questions',
  now() - interval '1 week',
  now() - interval '1 week'
);

-- Create sample messages for conversations (using correct message type "ai" not "assistant")
INSERT INTO public.messages (
  conversation_id,
  type,
  content,
  created_at
) VALUES 
(
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'user',
  'I''ve been experiencing persistent headaches and fatigue for the past week. Should I be concerned?',
  now() - interval '3 days'
),
(
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'ai',
  'I understand your concern about persistent headaches and fatigue. These symptoms can have various causes. Can you tell me more about the nature of your headaches? Are they throbbing, sharp, or dull? And when do you typically experience the fatigue most?',
  now() - interval '3 days' + interval '1 minute'
),
(
  '660e8400-e29b-41d4-a716-446655440001'::uuid,
  'user',
  'My wife Jane is 12 weeks pregnant and experiencing morning sickness. What are some safe remedies?',
  now() - interval '1 week'
),
(
  '660e8400-e29b-41d4-a716-446655440001'::uuid,
  'ai',
  'Morning sickness is very common during the first trimester. Here are some safe remedies that may help: eating small, frequent meals, ginger tea or ginger candies, staying hydrated, and avoiding foods that trigger nausea. However, it''s always best to consult with her healthcare provider for personalized advice.',
  now() - interval '1 week' + interval '2 minutes'
);