import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MedicalImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: string;
}

interface MedicalImagePrompt {
  searchTerm: string;
  images: MedicalImage[];
  isVisible: boolean;
}

// Medical terms that should trigger image prompts
const MEDICAL_TRIGGER_TERMS = {
  'bites': ['bite', 'bites', 'bitten', 'insect bite', 'bug bite'],
  'rash': ['rash', 'rashes', 'skin irritation', 'red spots'],
  'wound': ['wound', 'wounds', 'cut', 'cuts', 'injury'],
  'burn': ['burn', 'burns', 'burned', 'burning'],
  'bruise': ['bruise', 'bruises', 'bruising', 'black and blue'],
  'acne': ['acne', 'pimples', 'pimple', 'breakout'],
  'eczema': ['eczema', 'dermatitis', 'skin inflammation'],
  'psoriasis': ['psoriasis', 'scaly skin', 'skin patches'],
  'hives': ['hives', 'urticaria', 'welts', 'raised bumps'],
  'mole': ['mole', 'moles', 'skin spot', 'dark spot'],
  'infection': ['infection', 'infected', 'pus', 'swelling'],
  'tumor': ['tumor', 'mass', 'lump', 'growth'],
  'lesion': ['lesion', 'lesions', 'skin lesion', 'abnormal tissue']
};

export const useMedicalImagePrompts = () => {
  const { user } = useAuth();
  const [currentPrompt, setCurrentPrompt] = useState<MedicalImagePrompt | null>(null);
  const [loading, setLoading] = useState(false);

  const detectMedicalTerms = useCallback((message: string): string | null => {
    const lowerMessage = message.toLowerCase();
    
    for (const [category, terms] of Object.entries(MEDICAL_TRIGGER_TERMS)) {
      for (const term of terms) {
        if (lowerMessage.includes(term)) {
          return category;
        }
      }
    }
    
    return null;
  }, []);

  const fetchMedicalImages = useCallback(async (searchTerm: string): Promise<MedicalImage[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('medical-image-search', {
        body: { searchTerm, maxResults: 3 }
      });

      if (error) {
        console.error('Error fetching medical images:', error);
        return [];
      }

      return data?.images || [];
    } catch (error) {
      console.error('Error in fetchMedicalImages:', error);
      return [];
    }
  }, []);

  const triggerImagePrompt = useCallback(async (message: string): Promise<boolean> => {
    const detectedTerm = detectMedicalTerms(message);
    
    if (!detectedTerm || !user) {
      return false;
    }

    setLoading(true);
    
    try {
      const images = await fetchMedicalImages(detectedTerm);
      
      if (images.length > 0) {
        setCurrentPrompt({
          searchTerm: detectedTerm,
          images,
          isVisible: true
        });
        return true;
      }
    } catch (error) {
      console.error('Error triggering image prompt:', error);
    } finally {
      setLoading(false);
    }
    
    return false;
  }, [detectMedicalTerms, fetchMedicalImages, user]);

  const handleImageFeedback = useCallback(async (
    imageId: string, 
    matches: boolean, 
    searchTerm: string,
    conversationId?: string,
    patientId?: string
  ) => {
    if (!user) return;

    try {
      // Store feedback in conversation memory
      const feedbackData = {
        type: 'image_feedback',
        searchTerm,
        imageId,
        matches,
        timestamp: new Date().toISOString()
      };

      // Update conversation memory with image feedback
      if (conversationId && patientId) {
        await supabase.functions.invoke('analyze-conversation-memory', {
          body: {
            conversation_id: conversationId,
            patient_id: patientId,
            image_feedback: feedbackData
          }
        });
      }

      console.log('Image feedback recorded:', feedbackData);
    } catch (error) {
      console.error('Error recording image feedback:', error);
    }
  }, [user]);

  const closeImagePrompt = useCallback(() => {
    setCurrentPrompt(null);
  }, []);

  return {
    currentPrompt,
    loading,
    triggerImagePrompt,
    handleImageFeedback,
    closeImagePrompt,
    detectMedicalTerms
  };
};