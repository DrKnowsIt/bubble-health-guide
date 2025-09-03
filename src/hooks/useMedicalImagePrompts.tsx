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
  intent?: string;
  aiSuggestion?: string;
}

// Enhanced medical terms with broader coverage
const MEDICAL_TERMS_CATEGORIES = {
  // Skin conditions
  'skin_conditions': [
    'rash', 'rashes', 'skin irritation', 'red spots', 'acne', 'pimples', 'eczema', 
    'dermatitis', 'psoriasis', 'hives', 'urticaria', 'mole', 'moles', 'vitiligo',
    'rosacea', 'melasma', 'raynaud', 'raynauds', 'skin discoloration', 'patches'
  ],
  // Wounds and injuries
  'wounds_injuries': [
    'wound', 'wounds', 'cut', 'cuts', 'injury', 'bite', 'bites', 'burn', 'burns',
    'bruise', 'bruises', 'scratch', 'scrape', 'laceration', 'puncture'
  ],
  // Infections
  'infections': [
    'infection', 'infected', 'pus', 'swelling', 'cellulitis', 'abscess', 'impetigo',
    'fungal', 'staph', 'mrsa', 'pustule', 'boil', 'carbuncle'
  ],
  // Growths and lesions
  'growths_lesions': [
    'tumor', 'mass', 'lump', 'growth', 'lesion', 'lesions', 'nodule', 'cyst',
    'polyp', 'wart', 'skin tag', 'bump', 'swollen lymph'
  ],
  // Diagnostic imaging
  'imaging': [
    'x-ray', 'xray', 'ct scan', 'mri', 'ultrasound', 'mammogram', 'scan',
    'radiograph', 'imaging', 'film', 'picture'
  ]
};

// Intent detection patterns
const INTENT_PATTERNS = {
  symptom_description: [
    /i have/i, /i see/i, /i notice/i, /i found/i, /there is/i, /there are/i,
    /my \w+ (is|are|has|have)/i, /looks like/i, /appears to be/i
  ],
  educational_query: [
    /what does \w+ look like/i, /show me what/i, /what is \w+ supposed to/i,
    /how do i identify/i, /what are the signs of/i, /what should i look for/i
  ],
  diagnostic_understanding: [
    /what is.*(doctor|physician).*(looking for|checking|examining)/i,
    /what does.*(result|test|scan|report).*(mean|show|indicate)/i,
    /explain my (results|scan|test|xray|mri|ct)/i
  ],
  comparison_request: [
    /is this normal/i, /does this look right/i, /should this look like/i,
    /is this what.*(should|supposed to) look like/i, /compare/i
  ],
  uncertainty_indicators: [
    /i think it might be/i, /it looks like it could be/i, /maybe it\'s/i,
    /possibly/i, /not sure if/i, /wondering if/i
  ]
};

// Exclusion patterns that should NOT trigger images
const EXCLUSION_PATTERNS = [
  /i had/i, /was treated for/i, /my doctor said/i, /diagnosed with/i,
  /my friend/i, /my family/i, /someone i know/i, /people with/i,
  /in general/i, /usually/i, /typically/i, /normally/i
];

export const useMedicalImagePrompts = () => {
  const { user } = useAuth();
  const [currentPrompt, setCurrentPrompt] = useState<MedicalImagePrompt | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeMessageContext = useCallback((message: string): {
    category: string | null;
    intent: string | null;
    confidence: number;
    shouldTrigger: boolean;
  } => {
    const lowerMessage = message.toLowerCase();
    
    // Check exclusion patterns first
    for (const pattern of EXCLUSION_PATTERNS) {
      if (pattern.test(message)) {
        return { category: null, intent: null, confidence: 0, shouldTrigger: false };
      }
    }
    
    // Detect medical terms and category
    let detectedCategory: string | null = null;
    let termCount = 0;
    
    for (const [category, terms] of Object.entries(MEDICAL_TERMS_CATEGORIES)) {
      for (const term of terms) {
        if (lowerMessage.includes(term)) {
          detectedCategory = category;
          termCount++;
        }
      }
    }
    
    if (!detectedCategory) {
      return { category: null, intent: null, confidence: 0, shouldTrigger: false };
    }
    
    // Detect intent
    let detectedIntent: string | null = null;
    let intentConfidence = 0;
    
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          detectedIntent = intent;
          intentConfidence += 0.3;
        }
      }
    }
    
    // Calculate overall confidence
    const baseConfidence = termCount * 0.2;
    const totalConfidence = Math.min(baseConfidence + intentConfidence, 1.0);
    
    // Determine if we should trigger (only for high-confidence symptom descriptions or direct questions)
    const shouldTrigger = totalConfidence > 0.4 && (
      detectedIntent === 'symptom_description' ||
      detectedIntent === 'educational_query' ||
      detectedIntent === 'diagnostic_understanding' ||
      detectedIntent === 'comparison_request' ||
      detectedIntent === 'uncertainty_indicators'
    );
    
    return {
      category: detectedCategory,
      intent: detectedIntent,
      confidence: totalConfidence,
      shouldTrigger
    };
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

  const triggerImagePrompt = useCallback(async (
    message: string,
    aiSuggestion?: { shouldShow: boolean; searchTerm?: string; intent?: string; reasoning?: string }
  ): Promise<boolean> => {
    if (!user) return false;

    // Use AI suggestion if provided, otherwise analyze message
    let shouldShow = false;
    let searchTerm = '';
    let intent = '';

    if (aiSuggestion) {
      shouldShow = aiSuggestion.shouldShow;
      searchTerm = aiSuggestion.searchTerm || '';
      intent = aiSuggestion.intent || '';
    } else {
      const analysis = analyzeMessageContext(message);
      shouldShow = analysis.shouldTrigger;
      searchTerm = analysis.category || '';
      intent = analysis.intent || '';
    }

    if (!shouldShow || !searchTerm) {
      return false;
    }

    setLoading(true);
    
    try {
      const images = await fetchMedicalImages(searchTerm);
      
      if (images.length > 0) {
        setCurrentPrompt({
          searchTerm,
          images,
          isVisible: true,
          intent,
          aiSuggestion: aiSuggestion?.reasoning
        });
        return true;
      }
    } catch (error) {
      console.error('Error triggering image prompt:', error);
    } finally {
      setLoading(false);
    }
    
    return false;
  }, [analyzeMessageContext, fetchMedicalImages, user]);

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
    analyzeMessageContext
  };
};