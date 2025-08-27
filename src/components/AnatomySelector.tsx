import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { User, ArrowRight, RotateCcw } from 'lucide-react';

interface AnatomySelectorProps {
  onSelectionComplete: (selectedParts: string[]) => void;
}

interface BodyPart {
  id: string;
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage of container width
  height: number; // percentage of container height
  frontDescription: string;
  backDescription: string;
}

type ViewType = 'front' | 'back';

// Saved configuration from the perfect positioning
const BODY_PARTS: BodyPart[] = [
  { 
    id: '1', 
    name: 'Head', 
    x: 42, y: 5, width: 15.33, height: 11.67,
    frontDescription: 'Brain, eyes, nose, mouth, facial muscles, sinuses, jaw',
    backDescription: 'Back of skull, occipital region, neck base, cerebellum'
  },
  { 
    id: '2', 
    name: 'Neck', 
    x: 39.67, y: 17, width: 20, height: 5,
    frontDescription: 'Throat, thyroid, lymph nodes, trachea, esophagus',
    backDescription: 'Cervical spine, neck muscles, nerve pathways, vertebrae'
  },
  { 
    id: '3', 
    name: 'Upper Torso', 
    x: 39, y: 22.33, width: 22, height: 11,
    frontDescription: 'Heart, lungs, chest muscles, ribs, sternum, breasts',
    backDescription: 'Upper spine, shoulder blades, upper back muscles, lung bases'
  },
  { 
    id: '25', 
    name: 'Mid Torso', 
    x: 38, y: 33.33, width: 24, height: 5.67,
    frontDescription: 'Stomach, liver, gallbladder, diaphragm, pancreas, spleen',
    backDescription: 'Mid spine, kidneys, adrenal glands, middle back muscles'
  },
  { 
    id: '4', 
    name: 'Lower Torso', 
    x: 36.67, y: 39, width: 26, height: 13.67,
    frontDescription: 'Intestines, bladder, reproductive organs, pelvis, appendix',
    backDescription: 'Lower spine, pelvis (rear), lower back muscles, tailbone'
  },
  { 
    id: '5', 
    name: 'Left Shoulder', 
    x: 61, y: 19.67, width: 10.33, height: 7,
    frontDescription: 'Shoulder joint, deltoid muscle, clavicle, rotator cuff',
    backDescription: 'Shoulder blade, posterior deltoid, upper trapezius'
  },
  { 
    id: '6', 
    name: 'Right Shoulder', 
    x: 28.67, y: 19.67, width: 10.33, height: 7,
    frontDescription: 'Shoulder joint, deltoid muscle, clavicle, rotator cuff',
    backDescription: 'Shoulder blade, posterior deltoid, upper trapezius'
  },
  { 
    id: '7', 
    name: 'Left Upper Arm', 
    x: 63.83, y: 26.67, width: 8, height: 12,
    frontDescription: 'Biceps, humerus bone, brachial artery, lymph nodes',
    backDescription: 'Triceps, posterior humerus, radial nerve'
  },
  { 
    id: '8', 
    name: 'Right Upper Arm', 
    x: 28.17, y: 26.67, width: 8, height: 12,
    frontDescription: 'Biceps, humerus bone, brachial artery, lymph nodes',
    backDescription: 'Triceps, posterior humerus, radial nerve'
  },
  { 
    id: '9', 
    name: 'Left Elbow', 
    x: 65.5, y: 38.67, width: 6, height: 4,
    frontDescription: 'Elbow joint, ulnar nerve, brachial tendons',
    backDescription: 'Olecranon process, posterior elbow muscles'
  },
  { 
    id: '10', 
    name: 'Right Elbow', 
    x: 28.5, y: 38.67, width: 6, height: 4,
    frontDescription: 'Elbow joint, ulnar nerve, brachial tendons',
    backDescription: 'Olecranon process, posterior elbow muscles'
  },
  { 
    id: '11', 
    name: 'Left Forearm', 
    x: 67.5, y: 42.67, width: 7, height: 9,
    frontDescription: 'Radius, ulna bones, wrist flexors, radial artery',
    backDescription: 'Posterior forearm muscles, wrist extensors'
  },
  { 
    id: '12', 
    name: 'Right Forearm', 
    x: 25.5, y: 42.67, width: 7, height: 9,
    frontDescription: 'Radius, ulna bones, wrist flexors, radial artery',
    backDescription: 'Posterior forearm muscles, wrist extensors'
  },
  { 
    id: '13', 
    name: 'Left Hand', 
    x: 68.5, y: 50.67, width: 7, height: 8,
    frontDescription: 'Fingers, palm, thumb, metacarpals, tendons',
    backDescription: 'Back of hand, knuckles, finger extensors'
  },
  { 
    id: '14', 
    name: 'Right Hand', 
    x: 24.5, y: 50.67, width: 7, height: 8,
    frontDescription: 'Fingers, palm, thumb, metacarpals, tendons',
    backDescription: 'Back of hand, knuckles, finger extensors'
  },
  { 
    id: '15', 
    name: 'Left Hip', 
    x: 53, y: 52.89, width: 8, height: 6,
    frontDescription: 'Hip joint, hip flexors, femoral artery, groin',
    backDescription: 'Gluteal muscles, hip joint (posterior), piriformis'
  },
  { 
    id: '16', 
    name: 'Right Hip', 
    x: 39, y: 52.89, width: 8, height: 6,
    frontDescription: 'Hip joint, hip flexors, femoral artery, groin',
    backDescription: 'Gluteal muscles, hip joint (posterior), piriformis'
  },
  { 
    id: '17', 
    name: 'Left Upper Leg', 
    x: 53, y: 58.89, width: 9, height: 15,
    frontDescription: 'Quadriceps, femur bone, femoral vein, thigh muscles',
    backDescription: 'Hamstrings, posterior femur, sciatic nerve'
  },
  { 
    id: '18', 
    name: 'Right Upper Leg', 
    x: 38, y: 58.89, width: 9, height: 15,
    frontDescription: 'Quadriceps, femur bone, femoral vein, thigh muscles',
    backDescription: 'Hamstrings, posterior femur, sciatic nerve'
  },
  { 
    id: '19', 
    name: 'Left Knee', 
    x: 53.5, y: 73.89, width: 8, height: 4,
    frontDescription: 'Kneecap, patellar tendon, knee joint, meniscus',
    backDescription: 'Posterior knee, popliteal fossa, calf attachment'
  },
  { 
    id: '20', 
    name: 'Right Knee', 
    x: 38.5, y: 73.89, width: 8, height: 4,
    frontDescription: 'Kneecap, patellar tendon, knee joint, meniscus',
    backDescription: 'Posterior knee, popliteal fossa, calf attachment'
  },
  { 
    id: '21', 
    name: 'Left Lower Leg', 
    x: 54, y: 77.89, width: 7, height: 13,
    frontDescription: 'Shin bone, calf muscles, tibia, fibula, circulation',
    backDescription: 'Calf muscles, Achilles tendon, posterior muscles'
  },
  { 
    id: '22', 
    name: 'Right Lower Leg', 
    x: 39, y: 77.89, width: 7, height: 13,
    frontDescription: 'Shin bone, calf muscles, tibia, fibula, circulation',
    backDescription: 'Calf muscles, Achilles tendon, posterior muscles'
  },
  { 
    id: '23', 
    name: 'Left Foot', 
    x: 54.5, y: 90.89, width: 6, height: 5,
    frontDescription: 'Toes, arch, ankle, foot bones, plantar fascia',
    backDescription: 'Heel, Achilles insertion, posterior foot muscles'
  },
  { 
    id: '24', 
    name: 'Right Foot', 
    x: 39.5, y: 90.89, width: 6, height: 5,
    frontDescription: 'Toes, arch, ankle, foot bones, plantar fascia',
    backDescription: 'Heel, Achilles insertion, posterior foot muscles'
  }
];

export const AnatomySelector = ({ onSelectionComplete }: AnatomySelectorProps) => {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('front');
  const [imageDimensions, setImageDimensions] = useState({ width: 300, height: 600 });
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const updateImageDimensions = () => {
      if (imageRef.current) {
        const { offsetWidth, offsetHeight } = imageRef.current;
        setImageDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };

    const image = imageRef.current;
    if (image) {
      if (image.complete) {
        updateImageDimensions();
      } else {
        image.addEventListener('load', updateImageDimensions);
        return () => image.removeEventListener('load', updateImageDimensions);
      }
    }
  }, []);

  const toggleBodyPart = (partId: string) => {
    setSelectedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const toggleView = () => {
    setCurrentView(prev => prev === 'front' ? 'back' : 'front');
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <Card className="w-full max-w-2xl mx-auto bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
          <CardHeader className="text-center pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Select Body Parts</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Click on body parts to select them for analysis
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="relative inline-block">
                {/* View Toggle */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm">
                  <span className="text-sm font-medium">{currentView === 'front' ? 'Front View' : 'Back View'}</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={toggleView}
                    className="h-6 w-6 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                <img 
                  ref={imageRef}
                  src="/lovable-uploads/84dea027-e4dd-4221-b5fd-fb9d34bf82f8.png" 
                  alt="Human body silhouette" 
                  className="block filter drop-shadow-sm"
                  style={{ width: '300px', height: 'auto' }}
                />
                
                <div 
                  className="absolute top-0 left-0"
                  style={{ width: `${imageDimensions.width}px`, height: `${imageDimensions.height}px` }}
                >
                  {BODY_PARTS.map(part => {
                    const isSelected = selectedParts.includes(part.id);
                    const isHovered = hoveredPart === part.id;
                    const description = currentView === 'front' ? part.frontDescription : part.backDescription;
                    
                    return (
                      <HoverCard key={part.id}>
                        <HoverCardTrigger asChild>
                          <div
                            className={`absolute border-2 transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-primary/70 border-primary shadow-lg'
                                : isHovered
                                ? 'bg-primary/50 border-primary/80 shadow-md'
                                : 'bg-primary/30 border-primary/60 hover:bg-primary/40 hover:border-primary/70'
                            }`}
                            style={{
                              left: `${part.x}%`,
                              top: `${part.y}%`,
                              width: `${part.width}%`,
                              height: `${part.height}%`,
                            }}
                            onClick={() => toggleBodyPart(part.id)}
                            onMouseEnter={() => setHoveredPart(part.id)}
                            onMouseLeave={() => setHoveredPart(null)}
                          >
                            {/* Part label */}
                            {(isSelected || isHovered) && (
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-background/95 text-foreground text-xs px-2 py-1 rounded border shadow-sm whitespace-nowrap pointer-events-none z-10 backdrop-blur">
                                {part.name}
                              </div>
                            )}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{part.name}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <span className="font-medium">Common structures:</span> {description}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              Click to {isSelected ? 'deselect' : 'select'} this body part
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedParts.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-medium mb-3 text-center">Selected Body Parts ({selectedParts.length})</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {selectedParts.map(partId => {
                    const part = BODY_PARTS.find(p => p.id === partId);
                    if (!part) return null;
                    return (
                      <div 
                        key={partId} 
                        className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs border cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => toggleBodyPart(partId)}
                      >
                        {part.name}
                        <span className="text-muted-foreground ml-1">×</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => onSelectionComplete(selectedParts)}
                disabled={selectedParts.length === 0}
                className="min-w-[200px]"
              >
                Continue with {selectedParts.length} body part{selectedParts.length !== 1 ? 's' : ''}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};