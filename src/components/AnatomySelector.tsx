import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, ArrowRight, X } from 'lucide-react';

interface AnatomySelectorProps {
  onSelectionComplete: (selectedParts: string[]) => void;
}

interface BodyPart {
  id: string;
  name: string;
  displayName: string;
  maskImage?: string; // PNG mask for click detection
  description: string;
  includes: string[];
}

const bodyParts: BodyPart[] = [
  // Head and neck region - Using PNG mask
  {
    id: 'head',
    name: 'head',
    displayName: 'Head & Neck',
    maskImage: '/lovable-uploads/d33da18e-c6a7-4cc0-a3df-aed4a46e3a6e.png',
    description: 'The head and neck region encompasses all areas from the top of the skull down to the base of the neck.',
    includes: ['Forehead', 'Temples', 'Scalp', 'Face', 'Jaw', 'Ears', 'Eyes', 'Nose', 'Throat', 'Neck muscles', 'Cervical spine']
  },
  
  // Other body parts (we'll add PNG masks for these later)
  {
    id: 'chest',
    name: 'chest', 
    displayName: 'Chest',
    description: 'The chest area includes the upper torso, ribcage, and organs within the thoracic cavity.',
    includes: ['Upper chest', 'Lower chest', 'Ribs', 'Sternum', 'Heart area', 'Lung area', 'Breast area', 'Intercostal muscles']
  },
  {
    id: 'abdomen',
    name: 'abdomen',
    displayName: 'Abdomen',
    description: 'The abdominal region contains digestive organs and extends from below the ribs to the pelvis.',
    includes: ['Upper abdomen', 'Lower abdomen', 'Stomach area', 'Sides (flanks)', 'Navel area', 'Digestive organs', 'Abdominal muscles']
  },
  {
    id: 'pelvis',
    name: 'pelvis',
    displayName: 'Pelvis & Hips',
    description: 'The pelvic region includes the hip bones, reproductive organs, and lower abdominal structures.',
    includes: ['Hip bones', 'Groin area', 'Reproductive organs', 'Bladder area', 'Lower back connection', 'Pelvic muscles']
  },

  // Arms - Right (viewer's left)
  {
    id: 'right_shoulder',
    name: 'right_shoulder',
    displayName: 'Right Shoulder',
    description: 'The shoulder joint and surrounding muscles that connect the arm to the torso.',
    includes: ['Shoulder blade', 'Collarbone area', 'Shoulder joint', 'Rotator cuff', 'Deltoid muscle', 'Upper trap muscle']
  },
  {
    id: 'right_upper_arm',
    name: 'right_upper_arm',
    displayName: 'Right Upper Arm',
    description: 'The upper portion of the arm between the shoulder and elbow.',
    includes: ['Bicep muscle', 'Tricep muscle', 'Humerus bone', 'Upper arm muscles', 'Armpit area']
  },
  {
    id: 'right_forearm',
    name: 'right_forearm',
    displayName: 'Right Forearm',
    description: 'The lower arm between the elbow and wrist, containing two main bones.',
    includes: ['Radius bone', 'Ulna bone', 'Forearm muscles', 'Tendons', 'Elbow joint connection']
  },
  {
    id: 'right_hand',
    name: 'right_hand',
    displayName: 'Right Hand',
    description: 'The hand including fingers, thumb, palm, and wrist connection.',
    includes: ['Palm', 'Fingers', 'Thumb', 'Wrist', 'Knuckles', 'Hand muscles', 'Tendons']
  },

  // Arms - Left (viewer's right)
  {
    id: 'left_shoulder',
    name: 'left_shoulder',
    displayName: 'Left Shoulder',
    description: 'The shoulder joint and surrounding muscles that connect the arm to the torso.',
    includes: ['Shoulder blade', 'Collarbone area', 'Shoulder joint', 'Rotator cuff', 'Deltoid muscle', 'Upper trap muscle']
  },
  {
    id: 'left_upper_arm',
    name: 'left_upper_arm',
    displayName: 'Left Upper Arm',
    description: 'The upper portion of the arm between the shoulder and elbow.',
    includes: ['Bicep muscle', 'Tricep muscle', 'Humerus bone', 'Upper arm muscles', 'Armpit area']
  },
  {
    id: 'left_forearm',
    name: 'left_forearm',
    displayName: 'Left Forearm',
    description: 'The lower arm between the elbow and wrist, containing two main bones.',
    includes: ['Radius bone', 'Ulna bone', 'Forearm muscles', 'Tendons', 'Elbow joint connection']
  },
  {
    id: 'left_hand',
    name: 'left_hand',
    displayName: 'Left Hand',
    description: 'The hand including fingers, thumb, palm, and wrist connection.',
    includes: ['Palm', 'Fingers', 'Thumb', 'Wrist', 'Knuckles', 'Hand muscles', 'Tendons']
  },

  // Legs - Right (viewer's left)
  {
    id: 'right_thigh',
    name: 'right_thigh',
    displayName: 'Right Thigh',
    description: 'The upper leg between the hip and knee, containing the body\'s largest muscles.',
    includes: ['Quadriceps', 'Hamstrings', 'Femur bone', 'Hip joint connection', 'Thigh muscles']
  },
  {
    id: 'right_knee',
    name: 'right_knee',
    displayName: 'Right Knee',
    description: 'The knee joint connecting the thigh and lower leg bones.',
    includes: ['Kneecap', 'Knee joint', 'Ligaments', 'Cartilage', 'Surrounding muscles']
  },
  {
    id: 'right_shin',
    name: 'right_shin',
    displayName: 'Right Shin',
    description: 'The lower leg between the knee and ankle, containing two main bones.',
    includes: ['Tibia bone', 'Fibula bone', 'Shin muscles', 'Calf muscles', 'Lower leg tendons']
  },
  {
    id: 'right_foot',
    name: 'right_foot',
    displayName: 'Right Foot',
    description: 'The foot including toes, arch, heel, and ankle connection.',
    includes: ['Toes', 'Arch', 'Heel', 'Ankle', 'Foot muscles', 'Plantar fascia', 'Foot bones']
  },

  // Legs - Left (viewer's right)
  {
    id: 'left_thigh',
    name: 'left_thigh',
    displayName: 'Left Thigh',
    description: 'The upper leg between the hip and knee, containing the body\'s largest muscles.',
    includes: ['Quadriceps', 'Hamstrings', 'Femur bone', 'Hip joint connection', 'Thigh muscles']
  },
  {
    id: 'left_knee',
    name: 'left_knee',
    displayName: 'Left Knee',
    description: 'The knee joint connecting the thigh and lower leg bones.',
    includes: ['Kneecap', 'Knee joint', 'Ligaments', 'Cartilage', 'Surrounding muscles']
  },
  {
    id: 'left_shin',
    name: 'left_shin',
    displayName: 'Left Shin',
    description: 'The lower leg between the knee and ankle, containing two main bones.',
    includes: ['Tibia bone', 'Fibula bone', 'Shin muscles', 'Calf muscles', 'Lower leg tendons']
  },
  {
    id: 'left_foot',
    name: 'left_foot',
    displayName: 'Left Foot',
    description: 'The foot including toes, arch, heel, and ankle connection.',
    includes: ['Toes', 'Arch', 'Heel', 'Ankle', 'Foot muscles', 'Plantar fascia', 'Foot bones']
  },

  // Back areas (conceptual for front-view)
  {
    id: 'upper_back',
    name: 'upper_back',
    displayName: 'Upper Back',
    description: 'The upper portion of the back including shoulder blades and upper spine.',
    includes: ['Shoulder blades', 'Upper spine', 'Thoracic vertebrae', 'Upper back muscles', 'Rhomboids', 'Latissimus dorsi']
  },
  {
    id: 'lower_back',
    name: 'lower_back',
    displayName: 'Lower Back',
    description: 'The lower portion of the back including the lumbar spine and surrounding muscles.',
    includes: ['Lumbar spine', 'Lower back muscles', 'Lumbar vertebrae', 'Sacrum', 'Hip connection', 'Core muscles']
  }
];

export const AnatomySelector = ({ onSelectionComplete }: AnatomySelectorProps) => {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [maskImages, setMaskImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [isImagesLoaded, setIsImagesLoaded] = useState(false);
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);

  // Load mask images
  useEffect(() => {
    const loadMaskImages = async () => {
      const newMaskImages = new Map<string, HTMLImageElement>();
      
      for (const part of bodyParts) {
        if (part.maskImage) {
          const img = new Image();
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = part.maskImage!;
          });
          
          newMaskImages.set(part.id, img);
        }
      }
      
      setMaskImages(newMaskImages);
      setIsImagesLoaded(true);
    };

    loadMaskImages().catch(console.error);
  }, []);

  // Handle base image loading
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const handleLoad = () => {
      console.log('Base image loaded successfully');
      setBaseImageLoaded(true);
    };
    
    const handleError = (e: Event) => {
      console.error('Failed to load base image:', e);
      setBaseImageLoaded(false);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // If image is already loaded
    if (img.complete && img.naturalWidth > 0) {
      handleLoad();
    }

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, []);

  // Update canvas when images load or selection changes
  useEffect(() => {
    if (!isImagesLoaded || !baseImageLoaded || !canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImage = imageRef.current;
    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;
    
    // Clear and draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0);

    // Draw mask overlays for selected and hovered parts
    maskImages.forEach((maskImg, partId) => {
      const isSelected = selectedParts.includes(partId);
      const isHovered = hoveredPart === partId;
      
      if (isSelected || isHovered) {
        // Save current state
        ctx.save();
        
        // Set transparency and color
        ctx.globalAlpha = isSelected ? 0.7 : 0.4;
        
        // Create a temporary canvas for the colored mask
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // Draw mask to temp canvas
        tempCtx.drawImage(maskImg, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Color the mask
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = '#3b82f6'; // Primary blue color
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the colored mask to main canvas
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Restore state
        ctx.restore();
      }
    });
  }, [selectedParts, hoveredPart, isImagesLoaded, baseImageLoaded, maskImages]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check which body part was clicked using mask detection
    for (const [partId, maskImg] of maskImages.entries()) {
      if (isPixelInMask(x, y, maskImg)) {
        toggleBodyPart(partId);
        break;
      }
    }
  };

  const isPixelInMask = (x: number, y: number, maskImg: HTMLImageElement): boolean => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx || !canvasRef.current) return false;

    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    tempCtx.drawImage(maskImg, 0, 0, tempCanvas.width, tempCanvas.height);
    
    const imageData = tempCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
    const alpha = imageData.data[3];
    
    return alpha > 128; // Check if pixel is not transparent
  };

  const toggleBodyPart = (partId: string) => {
    setSelectedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const removePart = (partId: string) => {
    setSelectedParts(prev => prev.filter(id => id !== partId));
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <Card className="w-full max-w-3xl mx-auto bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
        <CardHeader className="text-center pb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Body Area Selection</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Free</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Click on body areas you'd like to discuss. Select multiple areas if needed.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Two-column layout: Body Image + Information Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Human Body with Clickable Areas */}
            <div className="flex justify-center">
              <div className="relative max-w-xs mx-auto">
                {/* Base image - visible until canvas loads */}
                <img 
                  ref={imageRef}
                  src="/lovable-uploads/84dea027-e4dd-4221-b5fd-fb9d34bf82f8.png" 
                  alt="Human body silhouette" 
                  className={`max-w-full max-h-full object-contain ${isImagesLoaded && baseImageLoaded ? 'hidden' : 'block'}`}
                />
                
                {/* Interactive canvas */}
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto max-h-[400px] object-contain filter drop-shadow-sm cursor-pointer"
                  style={{ maxWidth: '300px' }}
                  onClick={handleCanvasClick}
                  onMouseMove={(e) => {
                    if (!canvasRef.current) return;
                    const canvas = canvasRef.current;
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    
                    const x = (e.clientX - rect.left) * scaleX;
                    const y = (e.clientY - rect.top) * scaleY;

                    let newHoveredPart: string | null = null;
                    for (const [partId, maskImg] of maskImages.entries()) {
                      if (isPixelInMask(x, y, maskImg)) {
                        newHoveredPart = partId;
                        break;
                      }
                    }
                    setHoveredPart(newHoveredPart);
                  }}
                  onMouseLeave={() => setHoveredPart(null)}
                />
              </div>
            </div>

            {/* Right Column: Information Panel */}
            <div className="flex flex-col">
              <div className="bg-muted/30 rounded-lg p-4 min-h-[400px] flex flex-col">
                {hoveredPart ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {bodyParts.find(p => p.id === hoveredPart)?.displayName}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {bodyParts.find(p => p.id === hoveredPart)?.description}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">This area includes:</h4>
                      <div className="flex flex-wrap gap-2">
                        {bodyParts.find(p => p.id === hoveredPart)?.includes.map((item, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-xs bg-primary/10 text-primary border-primary/20"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="space-y-3">
                      <User className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Body Area Information</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Hover over any body part to see detailed information about that area
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Areas Pills */}
          {selectedParts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Selected Areas:</h3>
              <ScrollArea className="max-h-32">
                <div className="flex flex-wrap gap-2 pr-4">
                {selectedParts.map(partId => {
                  const part = bodyParts.find(p => p.id === partId);
                  return (
                    <Badge 
                      key={partId} 
                      variant="default"
                      className="px-3 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span>{part?.displayName}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePart(partId);
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${part?.displayName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Instructions and Status */}
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">
              {selectedParts.length === 0 ? (
                <p>Click on any body area above to get started</p>
              ) : (
                <p>
                  {selectedParts.length} area{selectedParts.length > 1 ? 's' : ''} selected. 
                  You can add more or continue to chat.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => onSelectionComplete(selectedParts)}
              disabled={selectedParts.length === 0}
              className="min-w-[250px] bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              Continue to Easy Chat
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Helper text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Selected areas will help our AI provide more targeted health guidance
            </p>
          </div>
        </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
