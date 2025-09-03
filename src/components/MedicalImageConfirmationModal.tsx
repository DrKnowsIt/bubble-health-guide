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
}

export const MedicalImageConfirmationModal = ({
  isOpen,
  onClose,
  searchTerm,
  images,
  onFeedback,
  loading = false
}: MedicalImageConfirmationModalProps) => {
  const [selectedImage, setSelectedImage] = useState<MedicalImage | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleFeedback = async (matches: boolean) => {
    if (!selectedImage) return;
    
    setSubmittingFeedback(true);
    try {
      await onFeedback(selectedImage.id, matches, searchTerm);
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
    setSubmittingFeedback(false);
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
            {selectedImage ? 'Does this match what you see?' : 'Is this what you\'re describing?'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Searching for: "{searchTerm}"
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
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">
                          {image.title}
                        </h4>
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
                  Doesn't look like this
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
                  Looks like this
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