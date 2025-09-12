import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ThumbsUp, ThumbsDown, AlertTriangle, Eye } from 'lucide-react';

interface MedicalImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: string;
}

interface MedicalImagePromptProps {
  searchTerm: string;
  images: MedicalImage[];
  aiSuggestion?: string;
  onImageFeedback: (imageId: string, matches: boolean) => void;
  onClose: () => void;
}

export const MedicalImagePrompt: React.FC<MedicalImagePromptProps> = ({
  searchTerm,
  images,
  aiSuggestion,
  onImageFeedback,
  onClose
}) => {
  if (images.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Does this look similar?
            </h3>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {searchTerm}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {aiSuggestion && (
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-md p-2">
            {aiSuggestion}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {images.slice(0, 6).map((image) => (
            <div key={image.id} className="space-y-2">
              <div className="aspect-square rounded-lg overflow-hidden bg-white dark:bg-gray-800 border border-border/50">
                <img
                  src={image.imageUrl}
                  alt={image.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/150x150?text=Medical+Image';
                  }}
                />
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground line-clamp-2">
                  {image.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {image.source}
                </p>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onImageFeedback(image.id, true)}
                  className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Similar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onImageFeedback(image.id, false)}
                  className="h-7 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Different
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 flex items-start gap-2">
          <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            These images are for reference only and should not be used for self-diagnosis. 
            Always consult with healthcare professionals for proper medical evaluation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};