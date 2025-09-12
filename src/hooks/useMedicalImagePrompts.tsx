import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  intent?: 'symptom_description' | 'educational_query' | 'comparison' | 'diagnosis_support';
  aiSuggestion?: string;
}

interface ImageSearchIntent {
  shouldTrigger: boolean;
  searchTerms: string[];
  primarySearchTerm: string;
  confidence: number;
  intent: 'symptom_description' | 'educational_query' | 'comparison' | 'diagnosis_support';
  preferredAPI: 'clinical';
  reasoning: string;
  aiSuggestion?: string;
}

export const useMedicalImagePrompts = () => {
  const { user } = useAuth();
  const [currentPrompt, setCurrentPrompt] = useState<MedicalImagePrompt | null>(null);
  const [loading, setLoading] = useState(false);

  // AI-powered message analysis using LLM with conversation context
  const analyzeMessageContext = useCallback(async (message: string, conversationContext?: string[]): Promise<ImageSearchIntent> => {
    try {
      console.log('Analyzing message with AI:', message);
      console.log('🔍 Conversation context provided:', conversationContext?.length || 0, 'recent messages');
      
      const { data, error } = await supabase.functions.invoke('analyze-image-search-intent', {
        body: { 
          message,
          conversationContext: conversationContext || []
        }
      });

      if (error) {
        console.error('Error calling analyze-image-search-intent:', error);
        return {
          shouldTrigger: false,
          searchTerms: [],
          primarySearchTerm: '',
          confidence: 0,
          intent: 'symptom_description',
          preferredAPI: 'clinical',
          reasoning: 'Analysis function error'
        };
      }

      console.log('AI analysis result:', data);
      return data;
    } catch (error) {
      console.error('Failed to analyze message context:', error);
      return {
        shouldTrigger: false,
        searchTerms: [],
        primarySearchTerm: '',
        confidence: 0,
        intent: 'symptom_description',
        preferredAPI: 'clinical',
        reasoning: 'Analysis failed'
      };
    }
  }, []);

  // Enhanced image fetching using only clinical API
  const fetchMedicalImages = useCallback(async (searchIntent: ImageSearchIntent): Promise<MedicalImage[]> => {
    console.log('Fetching clinical medical images based on AI analysis:', searchIntent);
    
    try {
      const { primarySearchTerm, searchTerms } = searchIntent;
      let allImages: MedicalImage[] = [];
      
      // Try primary search term with clinical API
      console.log('Trying clinical API with primary term:', primarySearchTerm);
      
      const { data: clinicalData, error: clinicalError } = await supabase.functions.invoke('clinical-image-search', {
        body: { 
          searchTerm: primarySearchTerm,
          maxResults: 6
        }
      });

      if (clinicalError) {
        console.error('Clinical API error:', clinicalError);
      } else if (clinicalData?.images?.length > 0) {
        console.log('✅ Clinical API returned', clinicalData.images.length, 'images');
        allImages = [...allImages, ...clinicalData.images];
      } else {
        console.log('❌ Clinical API returned no images for:', primarySearchTerm);
      }
      
      // If primary term didn't yield enough results, try alternative search terms
      if (allImages.length < 3 && searchTerms.length > 1) {
        console.log('Trying alternative search terms for more results...');
        
        for (const altTerm of searchTerms.slice(1, 3)) {
          if (allImages.length >= 6) break;
          
          console.log('Trying alternative clinical search term:', altTerm);
          
          const { data: altData, error: altError } = await supabase.functions.invoke('clinical-image-search', {
            body: { 
              searchTerm: altTerm,
              maxResults: 3
            }
          });

          if (altError) {
            console.error('Alternative clinical search error:', altError);
          } else if (altData?.images?.length > 0) {
            console.log('✅ Alternative term returned', altData.images.length, 'images');
            allImages = [...allImages, ...altData.images];
          }
        }
      }

      // Remove duplicates and limit results
      const uniqueImages = allImages.filter((image, index, self) => 
        index === self.findIndex(i => i.imageUrl === image.imageUrl)
      ).slice(0, 8);

      console.log('🎯 Total unique clinical images found:', uniqueImages.length);
      
      if (uniqueImages.length === 0) {
        console.log('⚠️ No clinical images found for any search terms:', [primarySearchTerm, ...searchTerms]);
      }
      
      return uniqueImages;
      
    } catch (error) {
      console.error('❌ Error fetching clinical medical images:', error);
      return [];
    }
  }, []);

  // Main function to trigger image prompt with AI analysis
  const triggerImagePrompt = useCallback(async (
    message: string, 
    aiSuggestion?: { shouldShow: boolean; searchTerm?: string; intent?: string; reasoning?: string },
    conversationContext?: string[]
  ): Promise<boolean> => {
    if (!user) {
      console.log('❌ No user found, cannot trigger image prompt');
      return false;
    }

    console.log('🚀 triggerImagePrompt called with message:', message);

    setLoading(true);
    try {
      if (aiSuggestion) {
        // If we have an AI suggestion, use it directly
        console.log('🤖 Using provided AI suggestion for image search');
        
        if (!aiSuggestion.shouldShow || !aiSuggestion.searchTerm) {
          console.log('❌ AI suggestion indicates no images needed');
          return false;
        }
        
        // Create a simple search intent for AI suggestions
        const searchIntent: ImageSearchIntent = {
          shouldTrigger: true,
          searchTerms: [aiSuggestion.searchTerm],
          primarySearchTerm: aiSuggestion.searchTerm,
          confidence: 90,
          intent: (aiSuggestion.intent as any) || 'diagnosis_support',
          preferredAPI: 'clinical',
          reasoning: 'AI suggested search term',
          aiSuggestion: aiSuggestion.reasoning
        };
        
        const images = await fetchMedicalImages(searchIntent);
        
        if (images.length > 0) {
          setCurrentPrompt({
            searchTerm: aiSuggestion.searchTerm,
            images,
            isVisible: true,
            intent: (aiSuggestion.intent as any) || 'diagnosis_support',
            aiSuggestion: aiSuggestion.reasoning
          });
          return true;
        }
      } else {
        // Use AI to analyze the message with conversation context
        const searchIntent = await analyzeMessageContext(message, conversationContext);
        console.log('AI analysis result:', searchIntent);
        
        if (searchIntent.shouldTrigger && searchIntent.confidence >= 60) {
          console.log('✅ High confidence - AI recommends showing images with confidence:', searchIntent.confidence);
          
          const images = await fetchMedicalImages(searchIntent);
          
          if (images.length > 0) {
            setCurrentPrompt({
              searchTerm: searchIntent.primarySearchTerm,
              images,
              isVisible: true,
              intent: searchIntent.intent,
              aiSuggestion: searchIntent.aiSuggestion
            });
            return true;
          } else {
            console.log('❌ No images found for searchTerm:', searchIntent.primarySearchTerm);
          }
        } else {
          console.log('❌ Low confidence or not relevant - AI analysis: No images needed -', 
            `Confidence: ${searchIntent.confidence}, Reasoning: ${searchIntent.reasoning}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in triggerImagePrompt:', error);
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