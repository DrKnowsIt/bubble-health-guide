import { useState } from 'react';
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
  coords: string; // SVG polygon or rect coordinates
  description: string;
  includes: string[];
}

const bodyParts: BodyPart[] = [
  // Head and neck region - Coordinates for 1024x1536 image dimensions
  {
    id: 'head',
    name: 'head',
    displayName: 'Head & Neck',
    coords: '475,65 549,65 583,75 608,95 628,120 640,150 648,185 640,220 628,255 608,285 583,310 549,330 512,340 475,330 441,310 416,285 396,255 384,220 376,185 384,150 396,120 416,95 441,75',
    description: 'The head and neck region encompasses all areas from the top of the skull down to the base of the neck.',
    includes: ['Forehead', 'Temples', 'Scalp', 'Face', 'Jaw', 'Ears', 'Eyes', 'Nose', 'Throat', 'Neck muscles', 'Cervical spine']
  },
  
  // Torso regions
  {
    id: 'chest',
    name: 'chest', 
    displayName: 'Chest',
    coords: '160,125 240,125 250,180 240,220 200,230 160,220 150,180',
    description: 'The chest area includes the upper torso, ribcage, and organs within the thoracic cavity.',
    includes: ['Upper chest', 'Lower chest', 'Ribs', 'Sternum', 'Heart area', 'Lung area', 'Breast area', 'Intercostal muscles']
  },
  {
    id: 'abdomen',
    name: 'abdomen',
    displayName: 'Abdomen',
    coords: '165,235 235,235 245,290 235,330 200,340 165,330 155,290',
    description: 'The abdominal region contains digestive organs and extends from below the ribs to the pelvis.',
    includes: ['Upper abdomen', 'Lower abdomen', 'Stomach area', 'Sides (flanks)', 'Navel area', 'Digestive organs', 'Abdominal muscles']
  },
  {
    id: 'pelvis',
    name: 'pelvis',
    displayName: 'Pelvis & Hips',
    coords: '170,345 230,345 240,390 230,420 200,430 170,420 160,390',
    description: 'The pelvic region includes the hip bones, reproductive organs, and lower abdominal structures.',
    includes: ['Hip bones', 'Groin area', 'Reproductive organs', 'Bladder area', 'Lower back connection', 'Pelvic muscles']
  },

  // Arms - Right (viewer's left)
  {
    id: 'right_shoulder',
    name: 'right_shoulder',
    displayName: 'Right Shoulder',
    coords: '125,140 160,140 165,170 155,200 145,210 125,200 115,170',
    description: 'The shoulder joint and surrounding muscles that connect the arm to the torso.',
    includes: ['Shoulder blade', 'Collarbone area', 'Shoulder joint', 'Rotator cuff', 'Deltoid muscle', 'Upper trap muscle']
  },
  {
    id: 'right_upper_arm',
    name: 'right_upper_arm',
    displayName: 'Right Upper Arm',
    coords: '115,215 145,215 150,270 140,320 130,330 115,320 105,270',
    description: 'The upper portion of the arm between the shoulder and elbow.',
    includes: ['Bicep muscle', 'Tricep muscle', 'Humerus bone', 'Upper arm muscles', 'Armpit area']
  },
  {
    id: 'right_forearm',
    name: 'right_forearm',
    displayName: 'Right Forearm',
    coords: '110,335 135,335 140,400 130,460 120,470 110,460 100,400',
    description: 'The lower arm between the elbow and wrist, containing two main bones.',
    includes: ['Radius bone', 'Ulna bone', 'Forearm muscles', 'Tendons', 'Elbow joint connection']
  },
  {
    id: 'right_hand',
    name: 'right_hand',
    displayName: 'Right Hand',
    coords: '105,475 135,475 140,520 125,540 105,540 95,520',
    description: 'The hand including fingers, thumb, palm, and wrist connection.',
    includes: ['Palm', 'Fingers', 'Thumb', 'Wrist', 'Knuckles', 'Hand muscles', 'Tendons']
  },

  // Arms - Left (viewer's right)
  {
    id: 'left_shoulder',
    name: 'left_shoulder',
    displayName: 'Left Shoulder',
    coords: '240,140 275,140 285,170 275,200 255,210 240,200 235,170',
    description: 'The shoulder joint and surrounding muscles that connect the arm to the torso.',
    includes: ['Shoulder blade', 'Collarbone area', 'Shoulder joint', 'Rotator cuff', 'Deltoid muscle', 'Upper trap muscle']
  },
  {
    id: 'left_upper_arm',
    name: 'left_upper_arm',
    displayName: 'Left Upper Arm',
    coords: '255,215 285,215 295,270 285,320 270,330 255,320 250,270',
    description: 'The upper portion of the arm between the shoulder and elbow.',
    includes: ['Bicep muscle', 'Tricep muscle', 'Humerus bone', 'Upper arm muscles', 'Armpit area']
  },
  {
    id: 'left_forearm',
    name: 'left_forearm',
    displayName: 'Left Forearm',
    coords: '265,335 290,335 300,400 290,460 280,470 265,460 260,400',
    description: 'The lower arm between the elbow and wrist, containing two main bones.',
    includes: ['Radius bone', 'Ulna bone', 'Forearm muscles', 'Tendons', 'Elbow joint connection']
  },
  {
    id: 'left_hand',
    name: 'left_hand',
    displayName: 'Left Hand',
    coords: '265,475 295,475 305,520 290,540 265,540 260,520',
    description: 'The hand including fingers, thumb, palm, and wrist connection.',
    includes: ['Palm', 'Fingers', 'Thumb', 'Wrist', 'Knuckles', 'Hand muscles', 'Tendons']
  },

  // Legs - Right (viewer's left)
  {
    id: 'right_thigh',
    name: 'right_thigh',
    displayName: 'Right Thigh',
    coords: '160,435 190,435 195,520 185,580 175,590 160,580 155,520',
    description: 'The upper leg between the hip and knee, containing the body\'s largest muscles.',
    includes: ['Quadriceps', 'Hamstrings', 'Femur bone', 'Hip joint connection', 'Thigh muscles']
  },
  {
    id: 'right_knee',
    name: 'right_knee',
    displayName: 'Right Knee',
    coords: '160,595 185,595 190,630 180,660 170,670 160,660 155,630',
    description: 'The knee joint connecting the thigh and lower leg bones.',
    includes: ['Kneecap', 'Knee joint', 'Ligaments', 'Cartilage', 'Surrounding muscles']
  },
  {
    id: 'right_shin',
    name: 'right_shin',
    displayName: 'Right Shin',
    coords: '165,675 180,675 185,760 175,820 165,830 160,820 155,760',
    description: 'The lower leg between the knee and ankle, containing two main bones.',
    includes: ['Tibia bone', 'Fibula bone', 'Shin muscles', 'Calf muscles', 'Lower leg tendons']
  },
  {
    id: 'right_foot',
    name: 'right_foot',
    displayName: 'Right Foot',
    coords: '155,835 185,835 195,870 175,885 155,885 145,870',
    description: 'The foot including toes, arch, heel, and ankle connection.',
    includes: ['Toes', 'Arch', 'Heel', 'Ankle', 'Foot muscles', 'Plantar fascia', 'Foot bones']
  },

  // Legs - Left (viewer's right)
  {
    id: 'left_thigh',
    name: 'left_thigh',
    displayName: 'Left Thigh',
    coords: '210,435 240,435 245,520 235,580 225,590 210,580 205,520',
    description: 'The upper leg between the hip and knee, containing the body\'s largest muscles.',
    includes: ['Quadriceps', 'Hamstrings', 'Femur bone', 'Hip joint connection', 'Thigh muscles']
  },
  {
    id: 'left_knee',
    name: 'left_knee',
    displayName: 'Left Knee',
    coords: '215,595 240,595 245,630 235,660 225,670 215,660 210,630',
    description: 'The knee joint connecting the thigh and lower leg bones.',
    includes: ['Kneecap', 'Knee joint', 'Ligaments', 'Cartilage', 'Surrounding muscles']
  },
  {
    id: 'left_shin',
    name: 'left_shin',
    displayName: 'Left Shin',
    coords: '220,675 235,675 240,760 230,820 220,830 215,820 210,760',
    description: 'The lower leg between the knee and ankle, containing two main bones.',
    includes: ['Tibia bone', 'Fibula bone', 'Shin muscles', 'Calf muscles', 'Lower leg tendons']
  },
  {
    id: 'left_foot',
    name: 'left_foot',
    displayName: 'Left Foot',
    coords: '215,835 245,835 255,870 235,885 215,885 205,870',
    description: 'The foot including toes, arch, heel, and ankle connection.',
    includes: ['Toes', 'Arch', 'Heel', 'Ankle', 'Foot muscles', 'Plantar fascia', 'Foot bones']
  },

  // Back areas (conceptual for front-view)
  {
    id: 'upper_back',
    name: 'upper_back',
    displayName: 'Upper Back',
    coords: '165,130 235,130 245,185 235,225 200,235 165,225 155,185',
    description: 'The upper portion of the back including shoulder blades and upper spine.',
    includes: ['Shoulder blades', 'Upper spine', 'Thoracic vertebrae', 'Upper back muscles', 'Rhomboids', 'Latissimus dorsi']
  },
  {
    id: 'lower_back',
    name: 'lower_back',
    displayName: 'Lower Back',
    coords: '170,240 230,240 240,295 230,335 200,345 170,335 160,295',
    description: 'The lower portion of the back including the lumbar spine and surrounding muscles.',
    includes: ['Lumbar spine', 'Lower back muscles', 'Lumbar vertebrae', 'Sacrum', 'Hip connection', 'Core muscles']
  }
];

export const AnatomySelector = ({ onSelectionComplete }: AnatomySelectorProps) => {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

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

  const isSelected = (partId: string) => selectedParts.includes(partId);
  const isHovered = (partId: string) => hoveredPart === partId;

  const getPartStyle = (partId: string) => {
    if (isSelected(partId)) {
      return {
        fill: 'hsl(var(--primary))',
        fillOpacity: 0.7,
        stroke: 'hsl(var(--primary))',
        strokeWidth: 3,
        filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))'
      };
    }
    if (isHovered(partId)) {
      return {
        fill: 'hsl(var(--primary) / 0.4)',
        fillOpacity: 0.6,
        stroke: 'hsl(var(--primary))',
        strokeWidth: 2,
        filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.3))'
      };
    }
    return {
      fill: 'transparent',
      fillOpacity: 0,
      stroke: 'transparent',
      strokeWidth: 1
    };
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
                {/* Base human silhouette image */}
                <img 
                  src="/lovable-uploads/06c04c75-fcba-4b38-a11b-ec0b46e6d3be.png" 
                  alt="Human body silhouette" 
                  className="w-full h-auto max-h-[400px] object-contain filter drop-shadow-sm"
                  style={{ maxWidth: '300px' }}
                />
                
                {/* Interactive SVG overlay - Matching actual image dimensions 1024x1536 */}
                <svg
                  className="absolute inset-0 w-full h-full cursor-pointer"
                  viewBox="0 0 1024 1536"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ pointerEvents: 'none' }}
                >
                  {bodyParts.map((part) => (
                    <polygon
                      key={part.id}
                      points={part.coords}
                      style={{
                        ...getPartStyle(part.id),
                        cursor: 'pointer',
                        pointerEvents: 'all',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => toggleBodyPart(part.id)}
                      onMouseEnter={() => setHoveredPart(part.id)}
                      onMouseLeave={() => setHoveredPart(null)}
                    />
                  ))}
                  {/* Debug overlay to verify alignment */}
                  <rect x="0" y="0" width="1024" height="1536" fill="none" stroke="red" strokeWidth="2" opacity="0.2" />
                </svg>
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