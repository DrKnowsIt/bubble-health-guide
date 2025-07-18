import { useState } from 'react';
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
import { 
  Users, 
  Activity, 
  Heart, 
  Utensils, 
  Dumbbell, 
  Dna,
  Upload
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
    id: 'family_history',
    title: 'Family Medical History',
    icon: Users,
    category: 'medical',
    fields: [
      { name: 'father_conditions', label: 'Father\'s Medical Conditions', type: 'textarea', placeholder: 'List any known conditions, age of onset, etc.' },
      { name: 'mother_conditions', label: 'Mother\'s Medical Conditions', type: 'textarea', placeholder: 'List any known conditions, age of onset, etc.' },
      { name: 'siblings_conditions', label: 'Siblings\' Medical Conditions', type: 'textarea', placeholder: 'List any known conditions among siblings' },
      { name: 'grandparents_conditions', label: 'Grandparents\' Medical Conditions', type: 'textarea', placeholder: 'Any notable family history from grandparents' },
      { name: 'family_cancer_history', label: 'Family Cancer History', type: 'select', options: ['None', 'Breast', 'Lung', 'Colon', 'Prostate', 'Other'], required: true },
      { name: 'family_heart_disease', label: 'Family Heart Disease History', type: 'select', options: ['None', 'Heart Attack', 'Stroke', 'High Blood Pressure', 'High Cholesterol'], required: true },
      { name: 'family_diabetes', label: 'Family Diabetes History', type: 'select', options: ['None', 'Type 1', 'Type 2', 'Gestational'], required: true },
      { name: 'genetic_disorders', label: 'Known Genetic Disorders', type: 'textarea', placeholder: 'Any inherited genetic conditions' }
    ]
  },
  {
    id: 'blood_panel',
    title: 'Blood Panel Results',
    icon: Activity,
    category: 'lab_results',
    fields: [
      { name: 'test_date', label: 'Test Date', type: 'date', required: true },
      { name: 'cholesterol_total', label: 'Total Cholesterol (mg/dL)', type: 'number', placeholder: '200' },
      { name: 'cholesterol_ldl', label: 'LDL Cholesterol (mg/dL)', type: 'number', placeholder: '100' },
      { name: 'cholesterol_hdl', label: 'HDL Cholesterol (mg/dL)', type: 'number', placeholder: '40' },
      { name: 'triglycerides', label: 'Triglycerides (mg/dL)', type: 'number', placeholder: '150' },
      { name: 'glucose_fasting', label: 'Fasting Glucose (mg/dL)', type: 'number', placeholder: '100' },
      { name: 'hemoglobin_a1c', label: 'Hemoglobin A1C (%)', type: 'number', placeholder: '5.7' },
      { name: 'vitamin_d', label: 'Vitamin D (ng/mL)', type: 'number', placeholder: '30' },
      { name: 'vitamin_b12', label: 'Vitamin B12 (pg/mL)', type: 'number', placeholder: '300' },
      { name: 'thyroid_tsh', label: 'TSH (mIU/L)', type: 'number', placeholder: '2.5' },
      { name: 'iron_levels', label: 'Iron Levels (µg/dL)', type: 'number', placeholder: '100' },
      { name: 'additional_markers', label: 'Additional Blood Markers', type: 'textarea', placeholder: 'Any other blood test results' }
    ]
  },
  {
    id: 'medical_history',
    title: 'Personal Medical History',
    icon: Heart,
    category: 'medical',
    fields: [
      { name: 'chronic_conditions', label: 'Chronic Conditions', type: 'textarea', placeholder: 'List any ongoing medical conditions' },
      { name: 'current_medications', label: 'Current Medications', type: 'textarea', placeholder: 'List all current medications and dosages', required: true },
      { name: 'allergies', label: 'Allergies', type: 'textarea', placeholder: 'Food, drug, or environmental allergies' },
      { name: 'surgeries', label: 'Past Surgeries', type: 'textarea', placeholder: 'List surgeries with dates' },
      { name: 'hospitalizations', label: 'Past Hospitalizations', type: 'textarea', placeholder: 'Reasons and dates for hospital stays' },
      { name: 'mental_health', label: 'Mental Health History', type: 'textarea', placeholder: 'Any mental health conditions or treatments' },
      { name: 'smoking_status', label: 'Smoking Status', type: 'select', options: ['Never smoked', 'Former smoker', 'Current smoker'], required: true },
      { name: 'alcohol_consumption', label: 'Alcohol Consumption', type: 'select', options: ['None', 'Occasional (1-2 drinks/week)', 'Moderate (3-7 drinks/week)', 'Heavy (8+ drinks/week)'], required: true },
      { name: 'exercise_frequency', label: 'Exercise Frequency', type: 'select', options: ['Sedentary', 'Light (1-2 times/week)', 'Moderate (3-4 times/week)', 'Active (5+ times/week)'], required: true }
    ]
  },
  {
    id: 'diet_nutrition',
    title: 'Diet & Nutrition',
    icon: Utensils,
    category: 'lifestyle',
    fields: [
      { name: 'diet_type', label: 'Primary Diet Type', type: 'select', options: ['Standard American', 'Mediterranean', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Other'], required: true },
      { name: 'daily_calories', label: 'Estimated Daily Calories', type: 'number', placeholder: '2000' },
      { name: 'meals_per_day', label: 'Meals Per Day', type: 'select', options: ['1', '2', '3', '4', '5+'], required: true },
      { name: 'water_intake', label: 'Daily Water Intake (glasses)', type: 'number', placeholder: '8' },
      { name: 'caffeine_intake', label: 'Daily Caffeine Intake', type: 'select', options: ['None', '1 cup coffee', '2-3 cups coffee', '4+ cups coffee', 'Energy drinks'], required: true },
      { name: 'food_allergies', label: 'Food Allergies/Intolerances', type: 'textarea', placeholder: 'List any food allergies or intolerances' },
      { name: 'supplements', label: 'Daily Supplements', type: 'textarea', placeholder: 'List all vitamins and supplements' },
      { name: 'eating_schedule', label: 'Typical Eating Schedule', type: 'textarea', placeholder: 'Describe when you typically eat meals' },
      { name: 'favorite_foods', label: 'Most Common Foods', type: 'textarea', placeholder: 'Foods you eat most frequently' },
      { name: 'dietary_restrictions', label: 'Dietary Restrictions', type: 'textarea', placeholder: 'Any religious, cultural, or personal dietary restrictions' }
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
      { name: 'dna_test_company', label: 'DNA Test Company', type: 'select', options: ['23andMe', 'AncestryDNA', 'MyHeritage', 'FamilyTreeDNA', 'Other', 'None'] },
      { name: 'dna_file', label: 'Raw DNA Data File', type: 'file', placeholder: 'Upload your raw DNA data file' },
      { name: 'ethnicity', label: 'Ethnicity/Ancestry', type: 'textarea', placeholder: 'Your ethnic background and ancestry' },
      { name: 'known_mutations', label: 'Known Genetic Mutations', type: 'textarea', placeholder: 'Any known genetic variants or mutations' },
      { name: 'pharmacogenomics', label: 'Drug Response Genetics', type: 'textarea', placeholder: 'Any known drug sensitivities or responses' },
      { name: 'carrier_status', label: 'Carrier Status', type: 'textarea', placeholder: 'Carrier status for genetic conditions' },
      { name: 'health_predispositions', label: 'Genetic Health Predispositions', type: 'textarea', placeholder: 'Any genetic predispositions to health conditions' }
    ]
  }
];

interface HealthFormsProps {
  onFormSubmit?: () => void;
}

export const HealthForms = ({ onFormSubmit }: HealthFormsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedForm, setSelectedForm] = useState<HealthForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/dna/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('health-records')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('health-records')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "Failed to upload file.",
      });
      return null;
    }
  };

  const submitForm = async () => {
    if (!selectedForm) return;

    setLoading(true);
    try {
      let fileUrl = null;
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

      const { error } = await supabase
        .from('health_records')
        .insert({
          user_id: user?.id,
          record_type: selectedForm.id,
          title: selectedForm.title,
          category: selectedForm.category,
          data: processedData,
          file_url: fileUrl,
          metadata: {
            form_version: '1.0',
            completed_at: new Date().toISOString()
          }
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedForm.title} saved successfully.`,
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
          <Input
            type="file"
            onChange={(e) => handleInputChange(field.name, e.target.files?.[0] || null)}
            accept=".txt,.csv,.vcf,.raw"
          />
        );

      default:
        return null;
    }
  };

  if (selectedForm) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Health Information Forms</CardTitle>
          <CardDescription>
            Complete these forms to provide DrKnowItAll with comprehensive health data for better analysis and insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthForms.map((form) => (
              <Card key={form.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedForm(form)}>
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
        </CardContent>
      </Card>
    </div>
  );
};