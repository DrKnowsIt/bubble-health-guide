import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Check } from "lucide-react";

interface MedicalImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: string;
}

interface MedicalImageConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  images: MedicalImage[];
  onFeedback: (imageId: string, matches: boolean, searchTerm: string) => void;
  loading?: boolean;
  intent?: string;
  aiSuggestion?: string;
}

export const MedicalImageConfirmationModal = ({
  isOpen,
  onClose,
  searchTerm,
  images,
  onFeedback,
  loading = false,
  intent,
  aiSuggestion
}: MedicalImageConfirmationModalProps) => {
  const [selectedImage, setSelectedImage] = useState<MedicalImage | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Generate medical names based on search terms and image data
  const getMedicalName = (image: MedicalImage, index: number) => {
    const searchLower = searchTerm.toLowerCase();
    const titleLower = image.title.toLowerCase();
    const descLower = image.description.toLowerCase();
    
    // Map search terms to proper medical names
    if (searchLower.includes('bed bug') || searchLower.includes('bite') || titleLower.includes('bite')) {
      return `Arthropod Bite Reaction #${index + 1}`;
    }
    if (searchLower.includes('dermatitis') || titleLower.includes('dermatitis')) {
      return `Contact Dermatitis #${index + 1}`;
    }
    if (searchLower.includes('eczema') || titleLower.includes('eczema')) {
      return `Atopic Dermatitis #${index + 1}`;
    }
    if (searchLower.includes('melanoma') || titleLower.includes('melanoma')) {
      return `Malignant Melanoma #${index + 1}`;
    }
    if (searchLower.includes('nevus') || titleLower.includes('nevus') || searchLower.includes('mole')) {
      return `Melanocytic Nevus #${index + 1}`;
    }
    if (searchLower.includes('psoriasis') || titleLower.includes('psoriasis')) {
      return `Psoriasis Vulgaris #${index + 1}`;
    }
    if (searchLower.includes('acne') || titleLower.includes('acne')) {
      return `Acne Vulgaris #${index + 1}`;
    }
    if (searchLower.includes('urticaria') || searchLower.includes('hives')) {
      return `Urticaria (Hives) #${index + 1}`;
    }
    if (searchLower.includes('rash') || searchLower.includes('inflammatory')) {
      return `Inflammatory Dermatosis #${index + 1}`;
    }
    if (searchLower.includes('larva migrans') || searchLower.includes('track')) {
      return `Cutaneous Larva Migrans #${index + 1}`;
    }
    
    // Fallback based on diagnosis in description
    if (descLower.includes('diagnosis:')) {
      const diagnosisMatch = descLower.match(/diagnosis:\s*([^,]+)/);
      if (diagnosisMatch) {
        return `${diagnosisMatch[1].trim()} #${index + 1}`;
      }
    }
    
    // Final fallback
    return `Clinical Case #${index + 1}`;
  };

  // Get context-aware button labels and modal content
  const getModalContent = () => {
    switch (intent) {
      case 'educational_query':
        return {
          title: `Medical Images: ${searchTerm.replace('_', ' ')}`,
          subtitle: aiSuggestion || 'Here are some medical images to help you understand this condition.',
          positiveButton: 'This helps me understand',
          negativeButton: 'Show me different examples'
        };
      case 'diagnostic_understanding':
        return {
          title: `Understanding Your Results: ${searchTerm.replace('_', ' ')}`,
          subtitle: aiSuggestion || 'These images show what doctors look for in diagnostic results.',
          positiveButton: 'This explains my results',
          negativeButton: 'I need more clarification'
        };
      case 'comparison_request':
        return {
          title: `Reference Images: ${searchTerm.replace('_', ' ')}`,
          subtitle: aiSuggestion || 'Compare these images with what you\'re seeing.',
          positiveButton: 'This looks similar',
          negativeButton: 'This looks different'
        };
      default: // symptom_description, uncertainty_indicators
        return {
          title: `Does this match your symptoms?`,
          subtitle: aiSuggestion || `Here are images related to ${searchTerm.replace('_', ' ')} to help identify your condition.`,
          positiveButton: 'This matches my condition',
          negativeButton: 'This doesn\'t match'
        };
    }
  };

  const modalContent = getModalContent();

  const handleFeedback = async (matches: boolean) => {
    if (!selectedImage) return;
    
    setSubmittingFeedback(true);
    try {
      await onFeedback(selectedImage.id, matches, searchTerm);
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const resetSelection = () => {
    setSelectedImage(null);
  };

  if (loading || images.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              Looking for medical images...
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              Searching for images related to "{searchTerm}"
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center">
            {selectedImage ? modalContent.title : (modalContent.title || 'Is this what you\'re describing?')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            {modalContent.subtitle}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh]">
          {!selectedImage ? (
            // Image selection view
            <div className="grid gap-4">
              {images.map((image) => (
                <Card 
                  key={image.id}
                  className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => setSelectedImage(image)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={image.imageUrl}
                            alt={image.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {image.title}
                          </h4>
                          <Badge variant="outline" className="text-xs font-medium">
                            {getMedicalName(image, images.indexOf(image))}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
                          {image.description}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {image.source}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  No, this doesn't help
                </Button>
              </div>
            </div>
          ) : (
            // Confirmation view
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative max-w-md">
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.title}
                    className="w-full rounded-lg shadow-lg"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h4 className="font-medium">{selectedImage.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedImage.description}
                </p>
                <Badge variant="outline" className="text-xs">
                  Source: {selectedImage.source}
                </Badge>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(false)}
                  disabled={submittingFeedback}
                  className="flex-1 max-w-40"
                >
                  <X className="h-4 w-4 mr-2" />
                  {modalContent.negativeButton}
                </Button>
                <Button
                  onClick={() => handleFeedback(true)}
                  disabled={submittingFeedback}
                  className="flex-1 max-w-40"
                >
                  {submittingFeedback ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {modalContent.positiveButton}
                </Button>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSelection}
                  disabled={submittingFeedback}
                >
                  View other images
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};