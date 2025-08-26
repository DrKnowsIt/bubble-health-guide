import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, ArrowRight } from 'lucide-react';

interface AnatomySelectorProps {
  onSelectionComplete: (selectedParts: string[]) => void;
}

interface BodyPart {
  id: string;
  name: string;
  displayName: string;
  path: string;
}

const bodyParts: BodyPart[] = [
  {
    id: 'head',
    name: 'head',
    displayName: 'Head & Neck',
    path: 'M85,15 C95,10 105,10 115,15 C120,20 120,35 115,45 C110,50 105,55 100,55 C95,55 90,50 85,45 C80,35 80,20 85,15 Z'
  },
  {
    id: 'chest',
    name: 'chest',
    displayName: 'Chest',
    path: 'M75,60 C75,55 85,50 100,50 C115,50 125,55 125,60 L125,90 C125,95 120,100 115,100 L85,100 C80,100 75,95 75,90 Z'
  },
  {
    id: 'abdomen',
    name: 'abdomen',
    displayName: 'Abdomen',
    path: 'M80,105 C80,100 85,95 100,95 C115,95 120,100 120,105 L120,140 C120,145 115,150 110,150 L90,150 C85,150 80,145 80,140 Z'
  },
  {
    id: 'left_arm',
    name: 'left_arm',
    displayName: 'Left Arm',
    path: 'M50,65 C45,60 40,65 35,70 L30,95 C28,105 30,110 35,108 L45,105 C50,103 55,100 60,95 L65,80 C68,70 60,65 50,65 Z'
  },
  {
    id: 'right_arm',
    name: 'right_arm',
    displayName: 'Right Arm',
    path: 'M150,65 C155,60 160,65 165,70 L170,95 C172,105 170,110 165,108 L155,105 C150,103 145,100 140,95 L135,80 C132,70 140,65 150,65 Z'
  },
  {
    id: 'left_leg',
    name: 'left_leg',
    displayName: 'Left Leg',
    path: 'M85,155 C85,150 90,145 95,145 C100,145 105,150 105,155 L105,220 C105,230 100,235 95,235 C90,235 85,230 85,220 Z'
  },
  {
    id: 'right_leg',
    name: 'right_leg',
    displayName: 'Right Leg',
    path: 'M95,155 C95,150 100,145 105,145 C110,145 115,150 115,155 L115,220 C115,230 110,235 105,235 C100,235 95,230 95,220 Z'
  },
  {
    id: 'back',
    name: 'back',
    displayName: 'Back & Spine',
    path: 'M85,65 C85,60 90,55 100,55 C110,55 115,60 115,65 L115,140 C115,145 110,150 100,150 C90,150 85,145 85,140 Z'
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

  const isSelected = (partId: string) => selectedParts.includes(partId);
  const isHovered = (partId: string) => hoveredPart === partId;

  const getPartFill = (partId: string) => {
    if (isSelected(partId)) return 'hsl(var(--primary))';
    if (isHovered(partId)) return 'hsl(var(--primary-light))';
    return 'hsl(var(--muted))';
  };

  const getPartOpacity = (partId: string) => {
    if (isSelected(partId)) return 0.8;
    if (isHovered(partId)) return 0.6;
    return 0.3;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <User className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Easy Chat - Body Area Selection</CardTitle>
          <Badge variant="secondary">Free</Badge>
        </div>
        <p className="text-muted-foreground">
          Select the body areas you'd like to discuss. You can choose multiple areas.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Human Body SVG */}
        <div className="flex justify-center">
          <div className="relative bg-card rounded-lg p-6 border border-border">
            <svg
              width="200"
              height="250"
              viewBox="0 0 200 250"
              className="mx-auto"
              style={{ filter: 'drop-shadow(0 2px 4px hsl(var(--shadow)))' }}
            >
              {/* Body outline */}
              <path
                d="M100,50 C120,50 130,60 130,80 L130,140 C130,160 120,170 100,170 C80,170 70,160 70,140 L70,80 C70,60 80,50 100,50 Z"
                fill="hsl(var(--card))"
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />

              {/* Clickable body parts */}
              {bodyParts.map((part) => (
                <path
                  key={part.id}
                  d={part.path}
                  fill={getPartFill(part.id)}
                  opacity={getPartOpacity(part.id)}
                  stroke={isSelected(part.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isSelected(part.id) ? "2" : "1"}
                  className="cursor-pointer transition-all duration-200 hover:stroke-2"
                  onClick={() => toggleBodyPart(part.id)}
                  onMouseEnter={() => setHoveredPart(part.id)}
                  onMouseLeave={() => setHoveredPart(null)}
                />
              ))}
            </svg>

            {/* Hover tooltip */}
            {hoveredPart && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded-md text-sm shadow-lg border">
                {bodyParts.find(p => p.id === hoveredPart)?.displayName}
              </div>
            )}
          </div>
        </div>

        {/* Selected areas display */}
        {selectedParts.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Selected Areas:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedParts.map(partId => {
                const part = bodyParts.find(p => p.id === partId);
                return (
                  <Badge 
                    key={partId} 
                    variant="default"
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleBodyPart(partId)}
                  >
                    {part?.displayName}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Click on body areas to select them. Selected areas will be highlighted in teal.
          </p>
          {selectedParts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Please select at least one area to continue.
            </p>
          )}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => onSelectionComplete(selectedParts)}
            disabled={selectedParts.length === 0}
            className="min-w-[200px]"
            size="lg"
          >
            Continue to Chat
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};