import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, ArrowRight, X } from 'lucide-react';

interface AnatomySelectorProps {
  onSelectionComplete: (selectedParts: string[]) => void;
}

interface BodyPart {
  id: string;
  name: string;
  displayName: string;
  coords: string; // SVG polygon or rect coordinates
}

const bodyParts: BodyPart[] = [
  // Head and neck region
  {
    id: 'head',
    name: 'head',
    displayName: 'Head & Neck',
    coords: '185,45 215,45 225,65 220,85 210,95 190,95 180,85 175,65'
  },
  
  // Torso regions
  {
    id: 'chest',
    name: 'chest', 
    displayName: 'Chest',
    coords: '175,110 225,110 240,130 235,160 225,170 175,170 165,160 160,130'
  },
  {
    id: 'abdomen',
    name: 'abdomen',
    displayName: 'Abdomen',
    coords: '180,175 220,175 230,195 225,220 215,230 185,230 175,220 170,195'
  },
  {
    id: 'pelvis',
    name: 'pelvis',
    displayName: 'Pelvis & Hips',
    coords: '185,235 215,235 225,255 220,275 210,285 190,285 180,275 175,255'
  },

  // Arms - Left (viewer's right)
  {
    id: 'left_shoulder',
    name: 'left_shoulder',
    displayName: 'Left Shoulder',
    coords: '240,115 270,115 280,135 275,155 265,165 245,165 235,155 230,135'
  },
  {
    id: 'left_upper_arm',
    name: 'left_upper_arm',
    displayName: 'Left Upper Arm',
    coords: '270,170 300,170 310,190 305,210 295,220 275,220 265,210 260,190'
  },
  {
    id: 'left_forearm',
    name: 'left_forearm',
    displayName: 'Left Forearm',
    coords: '295,225 325,225 335,245 330,265 320,275 300,275 290,265 285,245'
  },
  {
    id: 'left_hand',
    name: 'left_hand',
    displayName: 'Left Hand',
    coords: '320,280 350,280 360,295 355,310 345,320 325,320 315,310 310,295'
  },

  // Arms - Right (viewer's left)
  {
    id: 'right_shoulder',
    name: 'right_shoulder',
    displayName: 'Right Shoulder',
    coords: '130,115 160,115 170,135 165,155 155,165 135,165 125,155 120,135'
  },
  {
    id: 'right_upper_arm',
    name: 'right_upper_arm',
    displayName: 'Right Upper Arm',
    coords: '100,170 130,170 140,190 135,210 125,220 105,220 95,210 90,190'
  },
  {
    id: 'right_forearm',
    name: 'right_forearm',
    displayName: 'Right Forearm',
    coords: '75,225 105,225 115,245 110,265 100,275 80,275 70,265 65,245'
  },
  {
    id: 'right_hand',
    name: 'right_hand',
    displayName: 'Right Hand',
    coords: '50,280 80,280 90,295 85,310 75,320 55,320 45,310 40,295'
  },

  // Legs - Left (viewer's right)
  {
    id: 'left_thigh',
    name: 'left_thigh',
    displayName: 'Left Thigh',
    coords: '200,290 230,290 240,330 235,370 225,380 205,380 195,370 190,330'
  },
  {
    id: 'left_knee',
    name: 'left_knee',
    displayName: 'Left Knee',
    coords: '205,385 225,385 235,405 230,425 220,435 210,435 200,425 195,405'
  },
  {
    id: 'left_shin',
    name: 'left_shin',
    displayName: 'Left Shin',
    coords: '210,440 230,440 240,480 235,520 225,530 215,530 205,520 200,480'
  },
  {
    id: 'left_foot',
    name: 'left_foot',
    displayName: 'Left Foot',
    coords: '215,535 235,535 250,555 235,575 215,585 195,575 185,555 195,535'
  },

  // Legs - Right (viewer's left)
  {
    id: 'right_thigh',
    name: 'right_thigh',
    displayName: 'Right Thigh',
    coords: '170,290 200,290 210,330 205,370 195,380 175,380 165,370 160,330'
  },
  {
    id: 'right_knee',
    name: 'right_knee',
    displayName: 'Right Knee',
    coords: '175,385 195,385 205,405 200,425 190,435 180,435 170,425 165,405'
  },
  {
    id: 'right_shin',
    name: 'right_shin',
    displayName: 'Right Shin',
    coords: '170,440 190,440 200,480 195,520 185,530 175,530 165,520 160,480'
  },
  {
    id: 'right_foot',
    name: 'right_foot',
    displayName: 'Right Foot',
    coords: '165,535 185,535 200,555 185,575 165,585 145,575 135,555 145,535'
  },

  // Back areas (conceptual for front-view)
  {
    id: 'upper_back',
    name: 'upper_back',
    displayName: 'Upper Back',
    coords: '175,115 225,115 235,135 230,155 220,165 180,165 170,155 165,135'
  },
  {
    id: 'lower_back',
    name: 'lower_back',
    displayName: 'Lower Back',
    coords: '180,180 220,180 230,200 225,225 215,235 185,235 175,225 170,200'
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
    <div className="h-full flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl mx-auto bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <User className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Body Area Selection</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Free</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Click on the areas of your body you'd like to discuss. Select multiple areas if needed.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Human Body with Clickable Areas */}
          <div className="flex justify-center">
            <div className="relative max-w-md mx-auto">
              {/* Base human silhouette image */}
              <img 
                src="/lovable-uploads/018e2d73-bb78-4a90-8608-bc25125cfd88.png" 
                alt="Human body silhouette" 
                className="w-full h-auto max-h-[500px] object-contain filter drop-shadow-sm"
                style={{ maxWidth: '400px' }}
              />
              
              {/* Interactive SVG overlay */}
              <svg
                className="absolute inset-0 w-full h-full cursor-pointer"
                viewBox="0 0 400 600"
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
              </svg>

              {/* Hover tooltip */}
              {hoveredPart && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg text-sm shadow-lg border border-border z-10">
                  {bodyParts.find(p => p.id === hoveredPart)?.displayName}
                </div>
              )}
            </div>
          </div>

          {/* Selected Areas Pills */}
          {selectedParts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Selected Areas:</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
  );
};