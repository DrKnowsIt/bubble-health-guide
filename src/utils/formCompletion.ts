import { HealthForm } from '../components/health/HealthForms';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date' | 'file';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export const calculateFormCompletion = (formData: Record<string, any>, form: HealthForm): number => {
  if (!formData || !form.fields || form.fields.length === 0) {
    return 0;
  }

  let filledFields = 0;
  const totalFields = form.fields.length;

  form.fields.forEach((field: FormField) => {
    const value = formData[field.name];
    
    // Check if field has meaningful content
    if (value !== undefined && value !== null && value !== '') {
      // For arrays (checkboxes), check if at least one item is selected
      if (Array.isArray(value)) {
        if (value.length > 0) {
          filledFields++;
        }
      } else {
        filledFields++;
      }
    }
  });

  return Math.round((filledFields / totalFields) * 100);
};

export const getCompletionColor = (percentage: number): string => {
  if (percentage === 0) {
    return 'text-gray-400';
  } else if (percentage < 30) {
    return 'text-red-500';
  } else if (percentage < 70) {
    return 'text-yellow-500';
  } else if (percentage < 100) {
    return 'text-blue-500';
  } else {
    return 'text-green-500';
  }
};

export const getCompletionBadgeColor = (percentage: number): string => {
  if (percentage === 0) {
    return 'bg-gray-100 text-gray-600';
  } else if (percentage < 30) {
    return 'bg-red-100 text-red-700';
  } else if (percentage < 70) {
    return 'bg-yellow-100 text-yellow-700';
  } else if (percentage < 100) {
    return 'bg-blue-100 text-blue-700';
  } else {
    return 'bg-green-100 text-green-700';
  }
};