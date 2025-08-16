import { useState, useEffect } from 'react';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { UploadProgressDialog } from '@/components/UploadProgressDialog';
import { FormProgress } from '@/components/FormProgress';
import { UserSelectionGuide } from '@/components/UserSelectionGuide';
import { EmptyStateMessage } from '@/components/EmptyStateMessage';
import { 
  Users, 
  Activity, 
  Heart, 
  Utensils, 
  Dumbbell, 
  Dna,
  Upload,
  Calendar,
  Lock,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface HealthForm {
  id: string;
  title: string;
  icon: any;
  category: string;
  fields: FormField[];
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date' | 'file';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

const healthForms: HealthForm[] = [
  {
    id: 'personal_demographics',
    title: 'Personal Background & Demographics',
    icon: Users,
    category: 'personal',
    fields: [
      { name: 'age', label: 'Age', type: 'number', required: true, placeholder: '30' },
      { name: 'birth_sex', label: 'Birth Sex', type: 'select', options: ['Male', 'Female', 'Intersex'], required: true },
      { name: 'race_ethnicity', label: 'Race/Ethnicity', type: 'textarea', placeholder: 'Describe your racial/ethnic background (e.g., African American, Hispanic/Latino, Asian, European, Native American, Mixed, etc.)', required: true },
      { name: 'height', label: 'Height (inches)', type: 'number', required: true, placeholder: '70' },
      { name: 'current_weight', label: 'Current Weight (lbs)', type: 'number', required: true, placeholder: '150' },
      { name: 'weight_history', label: 'Weight History', type: 'textarea', placeholder: 'Past weights with dates (e.g., "180 lbs in 2022, 165 lbs in 2023"). Include any significant weight changes.' },
      { name: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Your current job/occupation' },
      { name: 'stress_level', label: 'Current Stress Level', type: 'select', options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'], required: true },
      { name: 'sleep_hours', label: 'Average Hours of Sleep', type: 'number', placeholder: '7.5' },
      { name: 'sleep_quality', label: 'Sleep Quality', type: 'select', options: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'], required: true },
      { name: 'current_gender', label: 'Current Gender Identity', type: 'select', options: ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'] }
    ]
  },
  {
    id: 'family_history',
    title: 'Family Medical History',
    icon: Users,
    category: 'medical',
    fields: [
      { name: 'father_conditions', label: 'Father\'s Medical Conditions', type: 'textarea', placeholder: 'List any known conditions, age of onset, current age/age at death' },
      { name: 'mother_conditions', label: 'Mother\'s Medical Conditions', type: 'textarea', placeholder: 'List any known conditions, age of onset, current age/age at death' },
      { name: 'siblings_conditions', label: 'Siblings\' Medical Conditions', type: 'textarea', placeholder: 'List any known conditions among siblings with their ages' },
      { name: 'grandparents_conditions', label: 'Grandparents\' Medical Conditions', type: 'textarea', placeholder: 'Any notable family history from grandparents, ages at death/major conditions' },
      { name: 'family_cancer_history', label: 'Family Cancer History', type: 'select', options: ['None', 'Breast', 'Lung', 'Colon', 'Prostate', 'Brain', 'Skin', 'Blood', 'Multiple types', 'Other'] },
      { name: 'family_heart_disease', label: 'Family Heart Disease History', type: 'select', options: ['None', 'Heart Attack', 'Stroke', 'High Blood Pressure', 'High Cholesterol', 'Heart Failure', 'Multiple conditions'] },
      { name: 'family_diabetes', label: 'Family Diabetes History', type: 'select', options: ['None', 'Type 1', 'Type 2', 'Gestational', 'Multiple types'] },
      { name: 'family_mental_health', label: 'Family Mental Health History', type: 'textarea', placeholder: 'Depression, anxiety, bipolar, schizophrenia, addiction, etc.' },
      { name: 'genetic_disorders', label: 'Known Genetic Disorders', type: 'textarea', placeholder: 'Any inherited genetic conditions or syndromes in the family' },
      { name: 'family_longevity', label: 'Family Longevity Patterns', type: 'textarea', placeholder: 'Ages at death for grandparents/great-grandparents, any patterns of early/late death' }
    ]
  },
  {
    id: 'blood_panel_current',
    title: 'Current Blood Panel Results',
    icon: Activity,
    category: 'lab_results',
    fields: [
      { name: 'test_date', label: 'Most Recent Test Date', type: 'date', required: true },
      { name: 'cholesterol_total', label: 'Total Cholesterol (mg/dL)', type: 'number', placeholder: '200' },
      { name: 'cholesterol_ldl', label: 'LDL Cholesterol (mg/dL)', type: 'number', placeholder: '100' },
      { name: 'cholesterol_hdl', label: 'HDL Cholesterol (mg/dL)', type: 'number', placeholder: '40' },
      { name: 'triglycerides', label: 'Triglycerides (mg/dL)', type: 'number', placeholder: '150' },
      { name: 'glucose_fasting', label: 'Fasting Glucose (mg/dL)', type: 'number', placeholder: '100' },
      { name: 'glucose_random', label: 'Random Glucose (mg/dL)', type: 'number', placeholder: '140' },
      { name: 'hemoglobin_a1c', label: 'Hemoglobin A1C (%)', type: 'number', placeholder: '5.7' },
      { name: 'vitamin_d', label: 'Vitamin D (ng/mL)', type: 'number', placeholder: '30' },
      { name: 'vitamin_b12', label: 'Vitamin B12 (pg/mL)', type: 'number', placeholder: '300' },
      { name: 'folate', label: 'Folate (ng/mL)', type: 'number', placeholder: '5' },
      { name: 'thyroid_tsh', label: 'TSH (mIU/L)', type: 'number', placeholder: '2.5' },
      { name: 'thyroid_t3', label: 'T3 (pg/mL)', type: 'number', placeholder: '3.0' },
      { name: 'thyroid_t4', label: 'T4 (ng/dL)', type: 'number', placeholder: '7.5' },
      { name: 'iron_levels', label: 'Iron Levels (µg/dL)', type: 'number', placeholder: '100' },
      { name: 'ferritin', label: 'Ferritin (ng/mL)', type: 'number', placeholder: '50' },
      { name: 'crp', label: 'C-Reactive Protein (mg/L)', type: 'number', placeholder: '1.0' },
      { name: 'white_blood_cells', label: 'White Blood Cell Count', type: 'number', placeholder: '7000' },
      { name: 'red_blood_cells', label: 'Red Blood Cell Count', type: 'number', placeholder: '4.5' },
      { name: 'platelets', label: 'Platelet Count', type: 'number', placeholder: '250000' },
      { name: 'additional_markers', label: 'Additional Blood Markers', type: 'textarea', placeholder: 'Any other blood test results, hormone levels, etc.' }
    ]
  },
  {
    id: 'blood_panel_historical',
    title: 'Historical Blood Panel Results',
    icon: Activity,
    category: 'lab_results',
    fields: [
      { name: 'historical_results', label: 'Past Blood Test Results', type: 'textarea', placeholder: 'Enter previous blood test results with dates. Format: "Date: [value] [unit]". Include cholesterol, glucose, A1C, vitamins, thyroid, etc. Show trends over time.' },
      { name: 'medication_changes', label: 'Medication Changes Related to Lab Results', type: 'textarea', placeholder: 'Any medications started/stopped based on blood work, with dates' },
      { name: 'lab_trends_noticed', label: 'Trends You\'ve Noticed', type: 'textarea', placeholder: 'Any patterns you\'ve observed in your lab results over time' }
    ]
  },
  {
    id: 'medical_history',
    title: 'Personal Medical History',
    icon: Heart,
    category: 'medical',
    fields: [
      { name: 'chronic_conditions', label: 'Current Chronic Conditions', type: 'textarea', placeholder: 'List any ongoing medical conditions with diagnosis dates' },
      { name: 'current_medications', label: 'Current Medications', type: 'textarea', placeholder: 'List all current medications, dosages, and how long you\'ve been taking them' },
      { name: 'past_medications', label: 'Past Medications', type: 'textarea', placeholder: 'Medications you\'ve discontinued, why you stopped, and any side effects experienced' },
      { name: 'allergies', label: 'Allergies & Intolerances', type: 'textarea', placeholder: 'Food, drug, environmental allergies. Include severity of reactions.' },
      { name: 'surgeries', label: 'Past Surgeries', type: 'textarea', placeholder: 'List all surgeries with dates, complications, recovery notes' },
      { name: 'hospitalizations', label: 'Past Hospitalizations', type: 'textarea', placeholder: 'Reasons, dates, length of stay for all hospital admissions' },
      { name: 'injuries', label: 'Significant Injuries', type: 'textarea', placeholder: 'Broken bones, concussions, major injuries with dates and ongoing effects' },
      { name: 'mental_health', label: 'Mental Health History', type: 'textarea', placeholder: 'Depression, anxiety, therapy, psychiatric medications, family mental health impact' },
      { name: 'reproductive_health', label: 'Reproductive Health', type: 'textarea', placeholder: 'Menstrual history, pregnancies, fertility issues, hormone treatments' },
      { name: 'smoking_status', label: 'Smoking Status', type: 'select', options: ['Never smoked', 'Former smoker (quit <1 year ago)', 'Former smoker (quit 1-5 years ago)', 'Former smoker (quit >5 years ago)', 'Current smoker'], required: true },
      { name: 'smoking_details', label: 'Smoking Details', type: 'textarea', placeholder: 'If you smoke/smoked: How much? For how long? When did you start/quit?' },
      { name: 'alcohol_consumption', label: 'Alcohol Consumption', type: 'select', options: ['None', 'Very occasional (few times per year)', 'Occasional (1-2 drinks/week)', 'Moderate (3-7 drinks/week)', 'Heavy (8-14 drinks/week)', 'Very heavy (15+ drinks/week)'], required: true },
      { name: 'alcohol_details', label: 'Alcohol Details', type: 'textarea', placeholder: 'Type of alcohol preferred, any past drinking problems, family history of alcoholism' },
      { name: 'substance_use', label: 'Other Substance Use', type: 'textarea', placeholder: 'Marijuana, prescription drug misuse, recreational drugs - current or past use' },
      { name: 'immunizations', label: 'Immunization History', type: 'textarea', placeholder: 'Recent vaccines, any missed childhood vaccines, flu shot frequency' }
    ]
  },
  {
    id: 'vital_signs_current',
    title: 'Current Vital Signs & Measurements',
    icon: Heart,
    category: 'vitals',
    fields: [
      { name: 'blood_pressure_systolic', label: 'Systolic Blood Pressure', type: 'number', placeholder: '120' },
      { name: 'blood_pressure_diastolic', label: 'Diastolic Blood Pressure', type: 'number', placeholder: '80' },
      { name: 'resting_heart_rate', label: 'Resting Heart Rate (BPM)', type: 'number', placeholder: '70' },
      { name: 'body_temperature', label: 'Normal Body Temperature (°F)', type: 'number', placeholder: '98.6' },
      { name: 'respiratory_rate', label: 'Respiratory Rate (breaths/min)', type: 'number', placeholder: '16' },
      { name: 'oxygen_saturation', label: 'Oxygen Saturation (%)', type: 'number', placeholder: '98' },
      { name: 'bp_measurement_time', label: 'When do you typically measure BP?', type: 'text', placeholder: 'Morning, evening, after exercise, etc.' },
      { name: 'bp_variations', label: 'Blood Pressure Variations', type: 'textarea', placeholder: 'Any patterns in your BP readings? White coat syndrome? Stress-related changes?' }
    ]
  },
  {
    id: 'vital_signs_historical',
    title: 'Historical Vital Signs & Health Metrics',
    icon: Activity,
    category: 'vitals',
    fields: [
      { name: 'bp_history', label: 'Blood Pressure History', type: 'textarea', placeholder: 'Past BP readings with dates. Include any hypertension diagnosis, medications started/stopped.' },
      { name: 'heart_rate_patterns', label: 'Heart Rate Patterns Over Time', type: 'textarea', placeholder: 'Resting HR changes, exercise HR recovery, any arrhythmias noticed' },
      { name: 'weight_detailed_history', label: 'Detailed Weight History', type: 'textarea', placeholder: 'Weight at different life stages: childhood, teens, 20s, 30s, etc. Major fluctuations and causes.' },
      { name: 'health_metric_trends', label: 'Health Metric Trends You\'ve Noticed', type: 'textarea', placeholder: 'Any patterns in your vital signs, energy levels, or health markers over months/years' }
    ]
  },
  {
    id: 'diet_nutrition_detailed',
    title: 'Detailed Diet & Nutrition Analysis',
    icon: Utensils,
    category: 'lifestyle',
    fields: [
      { name: 'diet_type', label: 'Primary Diet Type', type: 'select', options: ['Standard American', 'Mediterranean', 'Vegetarian', 'Vegan', 'Keto', 'Low-carb', 'Paleo', 'Intermittent Fasting', 'DASH', 'Gluten-free', 'Other'], required: true },
      { name: 'eating_schedule_detailed', label: 'Detailed Eating Schedule', type: 'select', options: ['Consistent daily schedule', 'Varies by day', 'Irregular/unpredictable', 'Shift work schedule'], required: true },
      { name: 'breakfast_time', label: 'Typical Breakfast Time', type: 'text', placeholder: 'e.g., 7:00 AM or "Don\'t eat breakfast"' },
      { name: 'breakfast_foods', label: 'Common Breakfast Foods', type: 'textarea', placeholder: 'What do you typically eat for breakfast? Include portion sizes if known.' },
      { name: 'lunch_time', label: 'Typical Lunch Time', type: 'text', placeholder: 'e.g., 12:30 PM or "Varies"' },
      { name: 'lunch_foods', label: 'Common Lunch Foods', type: 'textarea', placeholder: 'What do you typically eat for lunch? Include where you eat (home, work, restaurant).' },
      { name: 'dinner_time', label: 'Typical Dinner Time', type: 'text', placeholder: 'e.g., 6:30 PM or "Varies"' },
      { name: 'dinner_foods', label: 'Common Dinner Foods', type: 'textarea', placeholder: 'What do you typically eat for dinner? Include who cooks and typical portions.' },
      { name: 'snack_habits', label: 'Snacking Habits', type: 'textarea', placeholder: 'When do you snack? What do you snack on? How often?' },
      { name: 'water_intake_detailed', label: 'Water & Fluid Intake', type: 'textarea', placeholder: 'How much water, coffee, tea, soda, juice do you drink daily? When during the day?' },
      { name: 'caffeine_timing', label: 'Caffeine Timing & Sources', type: 'textarea', placeholder: 'When do you consume caffeine? Coffee, tea, energy drinks, soda? How does it affect you?' },
      { name: 'alcohol_timing', label: 'Alcohol Consumption Patterns', type: 'textarea', placeholder: 'When do you drink alcohol? Weekends only? With meals? Social drinking patterns?' },
      { name: 'food_cravings', label: 'Food Cravings & Triggers', type: 'textarea', placeholder: 'What foods do you crave? When? Stress eating patterns?' },
      { name: 'supplements_detailed', label: 'Supplements & Timing', type: 'textarea', placeholder: 'List all supplements, dosages, and when you take them (morning, evening, with food, etc.)' },
      { name: 'digestive_issues', label: 'Digestive Issues', type: 'textarea', placeholder: 'Any bloating, gas, stomach pain, bowel irregularities? Related to specific foods?' },
      { name: 'energy_food_relationship', label: 'Food & Energy Patterns', type: 'textarea', placeholder: 'How do different foods affect your energy? Post-meal fatigue? Best/worst foods for energy?' },
      { name: 'social_eating', label: 'Social Eating Patterns', type: 'textarea', placeholder: 'How often do you eat out? Family meals? Work lunches? Social food situations?' }
    ]
  },
  {
    id: 'workout_routine',
    title: 'Workout & Exercise Routine',
    icon: Dumbbell,
    category: 'lifestyle',
    fields: [
      { name: 'exercise_types', label: 'Types of Exercise', type: 'textarea', placeholder: 'Cardio, weight training, yoga, sports, etc.', required: true },
      { name: 'workout_frequency', label: 'Workout Frequency', type: 'select', options: ['Never', '1-2 times/week', '3-4 times/week', '5-6 times/week', 'Daily'], required: true },
      { name: 'workout_duration', label: 'Average Workout Duration', type: 'select', options: ['Less than 30 min', '30-45 min', '45-60 min', '60-90 min', 'More than 90 min'], required: true },
      { name: 'workout_intensity', label: 'Workout Intensity', type: 'select', options: ['Low', 'Moderate', 'High', 'Mixed'], required: true },
      { name: 'cardio_activities', label: 'Cardio Activities', type: 'textarea', placeholder: 'Running, cycling, swimming, etc.' },
      { name: 'strength_training', label: 'Strength Training Details', type: 'textarea', placeholder: 'Types of weights, machines, bodyweight exercises' },
      { name: 'flexibility_work', label: 'Flexibility/Mobility Work', type: 'textarea', placeholder: 'Yoga, stretching, physical therapy exercises' },
      { name: 'sports_activities', label: 'Sports Activities', type: 'textarea', placeholder: 'Any recreational or competitive sports' },
      { name: 'fitness_goals', label: 'Current Fitness Goals', type: 'textarea', placeholder: 'Weight loss, muscle gain, endurance, etc.' },
      { name: 'exercise_limitations', label: 'Exercise Limitations', type: 'textarea', placeholder: 'Any injuries or conditions that limit exercise' }
    ]
  },
  {
    id: 'dna_genetics',
    title: 'DNA & Genetic Information',
    icon: Dna,
    category: 'genetics',
    fields: [
      { name: 'dna_test_company', label: 'DNA Test Company', type: 'select', options: ['23andMe', 'AncestryDNA', 'MyHeritage', 'FamilyTreeDNA', 'Color Genomics', 'Invitae', 'Other', 'None'] },
      { name: 'dna_file', label: 'Raw DNA Data File', type: 'file', placeholder: 'Upload your raw DNA data file (.txt, .csv, or other format)' },
      { name: 'genetic_counseling', label: 'Genetic Counseling History', type: 'textarea', placeholder: 'Any genetic counseling sessions, results, or recommendations' },
      { name: 'known_mutations', label: 'Known Genetic Variants', type: 'textarea', placeholder: 'BRCA1/2, APOE, MTHFR, CYP variants, or any other known genetic mutations' },
      { name: 'pharmacogenomics', label: 'Drug Response Genetics', type: 'textarea', placeholder: 'How you respond to medications - slow/fast metabolizer status, drug sensitivities' },
      { name: 'carrier_status', label: 'Carrier Status', type: 'textarea', placeholder: 'Carrier status for cystic fibrosis, sickle cell, Tay-Sachs, or other genetic conditions' },
      { name: 'health_predispositions', label: 'Genetic Health Predispositions', type: 'textarea', placeholder: 'Genetic risks for heart disease, diabetes, Alzheimer\'s, cancer, or other conditions' },
      { name: 'ancestry_health_patterns', label: 'Ancestry-Related Health Patterns', type: 'textarea', placeholder: 'Health conditions common in your ethnic background that might be relevant' }
    ]
  },
  {
    id: 'patient_observations',
    title: 'Your Personal Health Observations',
    icon: Heart,
    category: 'personal',
    fields: [
      { name: 'symptom_patterns', label: 'Symptoms You\'ve Noticed', type: 'textarea', placeholder: 'Any recurring symptoms, when they occur, what might trigger them' },
      { name: 'energy_patterns', label: 'Energy Level Patterns', type: 'textarea', placeholder: 'When do you feel most/least energetic? Daily/seasonal patterns?' },
      { name: 'mood_health_connection', label: 'Mood & Health Connections', type: 'textarea', placeholder: 'How does your physical health affect your mood and vice versa?' },
      { name: 'stress_physical_impact', label: 'How Stress Affects Your Body', type: 'textarea', placeholder: 'Physical symptoms you get when stressed (headaches, stomach issues, muscle tension, etc.)' },
      { name: 'sleep_quality_factors', label: 'What Affects Your Sleep', type: 'textarea', placeholder: 'Foods, activities, stress, medications, or other factors that help or hurt your sleep' },
      { name: 'exercise_effects', label: 'How Exercise Affects You', type: 'textarea', placeholder: 'Energy levels, mood, sleep, pain, or other effects you notice from different types of exercise' },
      { name: 'weather_health_impact', label: 'Weather & Environmental Effects', type: 'textarea', placeholder: 'How weather, seasons, air quality, or environment affects your health and mood' },
      { name: 'menstrual_health_patterns', label: 'Menstrual/Hormonal Patterns (if applicable)', type: 'textarea', placeholder: 'PMS symptoms, cycle irregularities, hormone-related health changes' },
      { name: 'your_health_theories', label: 'Your Theories About Your Health', type: 'textarea', placeholder: 'What do YOU think might be causing any symptoms or health issues? Your gut feelings about your health.' },
      { name: 'self_care_strategies', label: 'What Helps You Feel Better', type: 'textarea', placeholder: 'Self-care strategies, home remedies, lifestyle changes that you\'ve found helpful' },
      { name: 'concerning_changes', label: 'Recent Changes That Concern You', type: 'textarea', placeholder: 'Any new symptoms, changes in how you feel, or health concerns you have' },
      { name: 'family_observations', label: 'Family/Friends\' Observations', type: 'textarea', placeholder: 'Things family or friends have noticed about your health that you might miss' }
    ]
  }
];

interface HealthFormsProps {
  onFormSubmit?: () => void;
  selectedPatient?: any | null;
}

export const HealthForms = ({ onFormSubmit, selectedPatient: propSelectedPatient }: HealthFormsProps) => {
  const { user } = useAuth();
  const { users, selectedUser: hookSelectedPatient } = useUsers();
  const { subscribed, subscription_tier } = useSubscription();
  
  // Use prop patient if provided, otherwise use hook patient
  const selectedPatient = propSelectedPatient !== undefined ? propSelectedPatient : hookSelectedPatient;
  const { toast } = useToast();
  const [selectedForm, setSelectedForm] = useState<HealthForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'uploading' | 'analyzing' | 'complete' | 'error'>('uploading');
  const [progressError, setProgressError] = useState<string>('');
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);

  // Define forms available for basic tier
  const basicTierFormIds = [
    'personal_demographics', 
    'medical_history', 
    'vital_signs_current', 
    'patient_observations'
  ];

  // Filter forms based on subscription tier
  const getAvailableForms = () => {
    if (!subscribed || !subscription_tier) return [];
    
    if (subscription_tier === 'basic') {
      return healthForms.filter(form => basicTierFormIds.includes(form.id));
    }
    
    if (subscription_tier === 'pro') {
      return healthForms;
    }
    
    return [];
  };

  const availableForms = getAvailableForms();
  const restrictedForms = healthForms.filter(form => !availableForms.includes(form));

  // Check if a form is accessible
  const isFormAccessible = (formId: string) => {
    return availableForms.some(form => form.id === formId);
  };

  // Update form data when selectedPatient changes
  useEffect(() => {
    // Auto-assign the selected patient to form data if available
    if (selectedPatient) {
      setFormData(prev => ({ ...prev, user_id: selectedPatient.id }));
    }
  }, [selectedPatient]);

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateFileSize = (file: File): boolean => {
    // Hard limit at 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Files must be under 10MB. Please compress your file or contact support for larger files.",
      });
      return false;
    }
    return true;
  };

  const triggerAIAnalysis = async (healthRecordId: string, fileName: string, fileSize: number) => {
    try {
      setCurrentStep('analyzing');
      setAnalysisProgress(10);

      // Simulate analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 15, 90));
      }, 800);

      const { data, error } = await supabase.functions.invoke('summarize-health-records', {
        body: { 
          health_record_id: healthRecordId,
          force_regenerate: true 
        }
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (error) throw error;

      setAnalysisSummary(data?.summary || 'Analysis completed successfully.');
      setCurrentStep('complete');
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysisSummary('Analysis completed with limited results due to file size or format.');
      setCurrentStep('complete');
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!validateFileSize(file)) return null;

    // Check if file is large (>5MB) for warning
    const isLargeFile = file.size > 5 * 1024 * 1024;
    
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);
    setShowProgressDialog(true);
    setCurrentStep('uploading');
    setUploadProgress(0);
    setAnalysisProgress(0);
    setProgressError('');
    setAnalysisSummary('');

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 12, 90));
      }, 300);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/forms/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('health-records')
        .upload(fileName, file);

      clearInterval(uploadInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('health-records')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      setCurrentStep('error');
      setProgressError(error.message || "Failed to upload file.");
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "Failed to upload file.",
      });
      return null;
    }
  };

  const closeProgressDialog = () => {
    setShowProgressDialog(false);
    setCurrentStep('uploading');
    setUploadProgress(0);
    setAnalysisProgress(0);
    setProgressError('');
    setAnalysisSummary('');
  };

  const submitForm = async () => {
    if (!selectedForm) return;

    setLoading(true);
    try {
      let fileUrl = null;
      let healthRecordId = null;
      const fileField = selectedForm.fields.find(f => f.type === 'file');
      
      if (fileField && formData[fileField.name]) {
        fileUrl = await handleFileUpload(formData[fileField.name]);
        if (!fileUrl) {
          setLoading(false);
          return;
        }
      }

      // Process form data
      const processedData = { ...formData };
      if (fileField) {
        delete processedData[fileField.name]; // Remove file object from data
      }

      const { data: recordData, error } = await supabase
        .from('health_records')
        .insert({
          user_id: user?.id,
          patient_id: selectedPatient?.id === 'none' ? null : selectedPatient?.id || null,
          record_type: selectedForm.id,
          title: selectedForm.title,
          category: selectedForm.category,
          data: {
            ...processedData,
            isLargeFile: fileField && formData[fileField.name] ? formData[fileField.name].size > 5 * 1024 * 1024 : false
          },
          file_url: fileUrl,
          metadata: {
            form_version: '1.0',
            completed_at: new Date().toISOString(),
            user_name: selectedPatient && selectedPatient.id !== 'none' ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null
          }
        })
        .select('id')
        .single();

      if (error) throw error;
      healthRecordId = recordData?.id;

      // Trigger AI analysis if file was uploaded
      if (fileUrl && healthRecordId && fileField && formData[fileField.name]) {
        await triggerAIAnalysis(healthRecordId, formData[fileField.name].name, formData[fileField.name].size);
      }

      toast({
        title: "Success",
        description: fileUrl ? `${selectedForm.title} saved and analyzed successfully.` : `${selectedForm.title} saved successfully.`,
      });

      setFormData({});
      setSelectedForm(null);
      onFormSubmit?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save form.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleInputChange(field.name, val)}
            required={field.required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <Input
              type="file"
              onChange={(e) => handleInputChange(field.name, e.target.files?.[0] || null)}
              accept=".txt,.csv,.vcf,.raw"
            />
            {/* Show existing DNA files for DNA genetics form */}
            {field.name === 'dna_file' && (
              <div className="text-xs text-muted-foreground">
                <p>📁 This will be saved to your Health Records → DNA Analysis section</p>
                <p>Any existing DNA files will be visible there after upload</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Count completed fields for progress tracking
  const completedFields = selectedForm 
    ? selectedForm.fields.filter(field => {
        const value = formData[field.name];
        if (field.required) {
          return value !== undefined && value !== '' && value !== null;
        }
        return value !== undefined && value !== '' && value !== null;
      }).length 
    : 0;

  if (selectedForm) {
    return (
      <div className="space-y-6">
        <FormProgress 
          currentStep={1}
          totalSteps={1}
          completedFields={completedFields}
          totalFields={selectedForm.fields.length}
          formTitle={selectedForm.title}
        />
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <selectedForm.icon className="h-5 w-5" />
                  {selectedForm.title}
                </CardTitle>
                <CardDescription>
                  Complete this form to help DrKnowItAll provide better health insights.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedForm(null)}>
                Back to Forms
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient_selection">Assign to Patient</Label>
              <Select
                value={selectedPatient?.id || 'none'}
                onValueChange={(value) => {
                  // This would typically update the selected patient in the parent component
                  // For now, we'll show which patient is selected
                }}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No specific patient (general form)</span>
                  </SelectItem>
                  {users.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <div className="flex items-center gap-2">
                        <span>{patient.first_name} {patient.last_name}</span>
                        {patient.is_primary && <span className="text-xs text-muted-foreground">(Primary)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose which patient this health form will be saved for.
              </p>
            </div>

            {selectedForm.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
            
            <div className="flex gap-2 pt-4">
              <Button onClick={submitForm} disabled={loading}>
                {loading ? 'Saving...' : 'Save Form'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    );
  }

  if (!subscribed || !subscription_tier) {
    return (
      <SubscriptionGate
        requiredTier="basic"
        feature="Health Forms"
        description="Access health forms to systematically collect and organize your medical information for better AI insights."
      >
        <div />
      </SubscriptionGate>
    );
  }

  // Show user selection guide if no users exist
  if (users.length === 0) {
    return (
      <UserSelectionGuide 
        hasUsers={false}
        hasSelectedUser={false}
        title="Health Forms"
        description="Create user profiles to complete health forms"
      />
    );
  }

  // Show empty state if no patient selected but patients exist
  if (!selectedPatient && users.length > 0) {
    return (
      <EmptyStateMessage 
        icon={<FileText className="h-6 w-6" />}
        title="Select a User"
        description="Choose a user from the dropdown above to complete their health forms and provide personalized health insights."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Optional Health Information Forms
            {selectedPatient && (
              <span className="text-sm font-normal text-muted-foreground">
                - {selectedPatient.first_name} {selectedPatient.last_name}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {selectedPatient 
              ? `Complete optional health forms for ${selectedPatient.first_name}. These forms help DrKnowItAll provide more personalized analysis.`
              : "Select a user to complete their optional health assessment forms. These forms help provide more personalized and insightful health analysis."
            }
            {subscription_tier === 'basic' && (
              <span className="block mt-2 text-orange-600">
                Your Basic plan includes 4 essential forms. Upgrade to Pro for access to all 11 comprehensive forms.
              </span>
            )}
          </CardDescription>
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Voluntary Participation</p>
              <p className="text-blue-700 mt-1">
                Completing these health forms is entirely voluntary. You may skip any questions or sections 
                you're not comfortable answering. This information is used solely to provide personalized 
                health insights and is not a substitute for professional medical advice.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          
          {/* Available Forms */}
          {availableForms.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">
                Available Forms ({availableForms.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableForms.map((form) => (
                  <Card 
                    key={form.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${!selectedPatient && users.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    onClick={() => {
                      if (selectedPatient || users.length === 0) {
                        setSelectedForm(form);
                      }
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <form.icon className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h3 className="font-medium mb-2">{form.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {form.fields.length} fields to complete
                          </p>
                          <Button size="sm">Fill Out Form</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Restricted Forms (for Basic tier users) */}
          {restrictedForms.length > 0 && subscription_tier === 'basic' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                Pro Forms ({restrictedForms.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restrictedForms.map((form) => (
                  <Card 
                    key={form.id} 
                    className="opacity-60 cursor-not-allowed border-dashed"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <form.icon className="h-6 w-6 text-muted-foreground mt-1" />
                          <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium mb-2 text-muted-foreground">{form.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {form.fields.length} fields • Pro Only
                          </p>
                          <Button size="sm" variant="outline" disabled>
                            <Lock className="h-3 w-3 mr-1" />
                            Upgrade to Access
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        open={showProgressDialog}
        onClose={closeProgressDialog}
        fileName={currentFileName}
        uploadProgress={uploadProgress}
        analysisProgress={analysisProgress}
        currentStep={currentStep}
        error={progressError}
        summary={analysisSummary}
        fileSize={currentFileSize}
        isLargeFile={currentFileSize > 5 * 1024 * 1024}
      />
    </div>
  );
};