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
    coords: '170,30 230,30 240,80 230,110 200,120 170,110 160,80'
  },
  
  // Torso regions
  {
    id: 'chest',
    name: 'chest', 
    displayName: 'Chest',
    coords: '160,125 240,125 250,180 240,220 200,230 160,220 150,180'
  },
  {
    id: 'abdomen',
    name: 'abdomen',
    displayName: 'Abdomen',
    coords: '165,235 235,235 245,290 235,330 200,340 165,330 155,290'
  },
  {
    id: 'pelvis',
    name: 'pelvis',
    displayName: 'Pelvis & Hips',
    coords: '170,345 230,345 240,390 230,420 200,430 170,420 160,390'
  },

  // Arms - Right (viewer's left)
  {
    id: 'right_shoulder',
    name: 'right_shoulder',
    displayName: 'Right Shoulder',
    coords: '125,140 160,140 165,170 155,200 145,210 125,200 115,170'
  },
  {
    id: 'right_upper_arm',
    name: 'right_upper_arm',
    displayName: 'Right Upper Arm',
    coords: '115,215 145,215 150,270 140,320 130,330 115,320 105,270'
  },
  {
    id: 'right_forearm',
    name: 'right_forearm',
    displayName: 'Right Forearm',
    coords: '110,335 135,335 140,400 130,460 120,470 110,460 100,400'
  },
  {
    id: 'right_hand',
    name: 'right_hand',
    displayName: 'Right Hand',
    coords: '105,475 135,475 140,520 125,540 105,540 95,520'
  },

  // Arms - Left (viewer's right)
  {
    id: 'left_shoulder',
    name: 'left_shoulder',
    displayName: 'Left Shoulder',
    coords: '240,140 275,140 285,170 275,200 255,210 240,200 235,170'
  },
  {
    id: 'left_upper_arm',
    name: 'left_upper_arm',
    displayName: 'Left Upper Arm',
    coords: '255,215 285,215 295,270 285,320 270,330 255,320 250,270'
  },
  {
    id: 'left_forearm',
    name: 'left_forearm',
    displayName: 'Left Forearm',
    coords: '265,335 290,335 300,400 290,460 280,470 265,460 260,400'
  },
  {
    id: 'left_hand',
    name: 'left_hand',
    displayName: 'Left Hand',
    coords: '265,475 295,475 305,520 290,540 265,540 260,520'
  },

  // Legs - Right (viewer's left)
  {
    id: 'right_thigh',
    name: 'right_thigh',
    displayName: 'Right Thigh',
    coords: '160,435 190,435 195,520 185,580 175,590 160,580 155,520'
  },
  {
    id: 'right_knee',
    name: 'right_knee',
    displayName: 'Right Knee',
    coords: '160,595 185,595 190,630 180,660 170,670 160,660 155,630'
  },
  {
    id: 'right_shin',
    name: 'right_shin',
    displayName: 'Right Shin',
    coords: '165,675 180,675 185,760 175,820 165,830 160,820 155,760'
  },
  {
    id: 'right_foot',
    name: 'right_foot',
    displayName: 'Right Foot',
    coords: '155,835 185,835 195,870 175,885 155,885 145,870'
  },

  // Legs - Left (viewer's right)
  {
    id: 'left_thigh',
    name: 'left_thigh',
    displayName: 'Left Thigh',
    coords: '210,435 240,435 245,520 235,580 225,590 210,580 205,520'
  },
  {
    id: 'left_knee',
    name: 'left_knee',
    displayName: 'Left Knee',
    coords: '215,595 240,595 245,630 235,660 225,670 215,660 210,630'
  },
  {
    id: 'left_shin',
    name: 'left_shin',
    displayName: 'Left Shin',
    coords: '220,675 235,675 240,760 230,820 220,830 215,820 210,760'
  },
  {
    id: 'left_foot',
    name: 'left_foot',
    displayName: 'Left Foot',
    coords: '215,835 245,835 255,870 235,885 215,885 205,870'
  },

  // Back areas (conceptual for front-view)
  {
    id: 'upper_back',
    name: 'upper_back',
    displayName: 'Upper Back',
    coords: '165,130 235,130 245,185 235,225 200,235 165,225 155,185'
  },
  {
    id: 'lower_back',
    name: 'lower_back',
    displayName: 'Lower Back',
    coords: '170,240 230,240 240,295 230,335 200,345 170,335 160,295'
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
    <div className="h-full flex flex-col justify-center p-3">
      <Card className="w-full max-w-3xl mx-auto bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95 flex-shrink-0">
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
          {/* Human Body with Clickable Areas */}
          <div className="flex justify-center">
            <div className="relative max-w-xs mx-auto">
              {/* Base human silhouette image */}
              <img 
                src="/lovable-uploads/06c04c75-fcba-4b38-a11b-ec0b46e6d3be.png" 
                alt="Human body silhouette" 
                className="w-full h-auto max-h-[400px] object-contain filter drop-shadow-sm"
                style={{ maxWidth: '300px' }}
              />
              
              {/* Interactive SVG overlay */}
              <svg
                className="absolute inset-0 w-full h-full cursor-pointer"
                viewBox="0 0 400 900"
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