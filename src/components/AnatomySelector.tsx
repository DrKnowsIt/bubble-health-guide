import React, { useState, useRef, useEffect } from 'react';
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
  description: string;
  includes: string[];
  position: { x: number; y: number; width: number; height: number }; // Rectangle position and size (percentages)
  transform: { rotation: number; scaleX: number; scaleY: number }; // Transform properties
}

const bodyParts: BodyPart[] = [
  {
    id: 'head',
    name: 'head',
    displayName: 'Head & Neck',
    description: 'The head and neck region encompasses all areas from the top of the skull down to the base of the neck.',
    includes: ['Forehead', 'Temples', 'Scalp', 'Face', 'Jaw', 'Ears', 'Eyes', 'Nose', 'Throat', 'Neck muscles', 'Cervical spine'],
    position: { x: 50, y: 12, width: 16, height: 20 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'chest',
    name: 'chest', 
    displayName: 'Chest',
    description: 'The chest area includes the upper torso, ribcage, and organs within the thoracic cavity.',
    includes: ['Upper chest', 'Lower chest', 'Ribs', 'Sternum', 'Heart area', 'Lung area', 'Breast area', 'Intercostal muscles'],
    position: { x: 50, y: 35, width: 24, height: 15 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'abdomen',
    name: 'abdomen',
    displayName: 'Abdomen',
    description: 'The abdominal region contains digestive organs and extends from below the ribs to the pelvis.',
    includes: ['Upper abdomen', 'Lower abdomen', 'Stomach area', 'Sides (flanks)', 'Navel area', 'Digestive organs', 'Abdominal muscles'],
    position: { x: 50, y: 52, width: 20, height: 12 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'pelvis',
    name: 'pelvis',
    displayName: 'Pelvis & Hips',
    description: 'The pelvic region includes the hip bones, reproductive organs, and lower abdominal structures.',
    includes: ['Hip bones', 'Groin area', 'Reproductive organs', 'Bladder area', 'Lower back connection', 'Pelvic muscles'],
    position: { x: 50, y: 67, width: 18, height: 10 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  // Right side (viewer's left)
  {
    id: 'right_shoulder',
    name: 'right_shoulder',
    displayName: 'Right Shoulder',
    description: 'The shoulder joint and surrounding muscles that connect the arm to the torso.',
    includes: ['Shoulder blade', 'Collarbone area', 'Shoulder joint', 'Rotator cuff', 'Deltoid muscle', 'Upper trap muscle'],
    position: { x: 30, y: 30, width: 12, height: 10 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'right_upper_arm',
    name: 'right_upper_arm',
    displayName: 'Right Upper Arm',
    description: 'The upper portion of the arm between the shoulder and elbow.',
    includes: ['Bicep muscle', 'Tricep muscle', 'Humerus bone', 'Upper arm muscles', 'Armpit area'],
    position: { x: 20, y: 42, width: 8, height: 16 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'right_forearm',
    name: 'right_forearm',
    displayName: 'Right Forearm',
    description: 'The lower arm between the elbow and wrist, containing two main bones.',
    includes: ['Radius bone', 'Ulna bone', 'Forearm muscles', 'Tendons', 'Elbow joint connection'],
    position: { x: 12, y: 58, width: 7, height: 14 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'right_hand',
    name: 'right_hand',
    displayName: 'Right Hand',
    description: 'The hand including fingers, thumb, palm, and wrist connection.',
    includes: ['Palm', 'Fingers', 'Thumb', 'Wrist', 'Knuckles', 'Hand muscles', 'Tendons'],
    position: { x: 10, y: 72, width: 6, height: 8 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  // Left side (viewer's right)
  {
    id: 'left_shoulder',
    name: 'left_shoulder',
    displayName: 'Left Shoulder',
    description: 'The shoulder joint and surrounding muscles that connect the arm to the torso.',
    includes: ['Shoulder blade', 'Collarbone area', 'Shoulder joint', 'Rotator cuff', 'Deltoid muscle', 'Upper trap muscle'],
    position: { x: 70, y: 30, width: 12, height: 10 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'left_upper_arm',
    name: 'left_upper_arm',
    displayName: 'Left Upper Arm',
    description: 'The upper portion of the arm between the shoulder and elbow.',
    includes: ['Bicep muscle', 'Tricep muscle', 'Humerus bone', 'Upper arm muscles', 'Armpit area'],
    position: { x: 80, y: 42, width: 8, height: 16 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'left_forearm',
    name: 'left_forearm',
    displayName: 'Left Forearm',
    description: 'The lower arm between the elbow and wrist, containing two main bones.',
    includes: ['Radius bone', 'Ulna bone', 'Forearm muscles', 'Tendons', 'Elbow joint connection'],
    position: { x: 88, y: 58, width: 7, height: 14 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'left_hand',
    name: 'left_hand',
    displayName: 'Left Hand',
    description: 'The hand including fingers, thumb, palm, and wrist connection.',
    includes: ['Palm', 'Fingers', 'Thumb', 'Wrist', 'Knuckles', 'Hand muscles', 'Tendons'],
    position: { x: 90, y: 72, width: 6, height: 8 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  // Right leg (viewer's left)
  {
    id: 'right_thigh',
    name: 'right_thigh',
    displayName: 'Right Thigh',
    description: 'The upper leg between the hip and knee, containing the body\'s largest muscles.',
    includes: ['Quadriceps', 'Hamstrings', 'Femur bone', 'Hip joint connection', 'Thigh muscles'],
    position: { x: 43, y: 75, width: 9, height: 18 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'right_knee',
    name: 'right_knee',
    displayName: 'Right Knee',
    description: 'The knee joint connecting the thigh and lower leg bones.',
    includes: ['Kneecap', 'Knee joint', 'Ligaments', 'Cartilage', 'Surrounding muscles'],
    position: { x: 43, y: 84, width: 8, height: 6 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'right_shin',
    name: 'right_shin',
    displayName: 'Right Shin',
    description: 'The lower leg between the knee and ankle, containing two main bones.',
    includes: ['Tibia bone', 'Fibula bone', 'Shin muscles', 'Calf muscles', 'Lower leg tendons'],
    position: { x: 43, y: 88, width: 7, height: 16 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'right_foot',
    name: 'right_foot',
    displayName: 'Right Foot',
    description: 'The foot including toes, arch, heel, and ankle connection.',
    includes: ['Toes', 'Arch', 'Heel', 'Ankle', 'Foot muscles', 'Plantar fascia', 'Foot bones'],
    position: { x: 43, y: 96, width: 8, height: 6 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  // Left leg (viewer's right)
  {
    id: 'left_thigh',
    name: 'left_thigh',
    displayName: 'Left Thigh',
    description: 'The upper leg between the hip and knee, containing the body\'s largest muscles.',
    includes: ['Quadriceps', 'Hamstrings', 'Femur bone', 'Hip joint connection', 'Thigh muscles'],
    position: { x: 57, y: 75, width: 9, height: 18 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'left_knee',
    name: 'left_knee',
    displayName: 'Left Knee',
    description: 'The knee joint connecting the thigh and lower leg bones.',
    includes: ['Kneecap', 'Knee joint', 'Ligaments', 'Cartilage', 'Surrounding muscles'],
    position: { x: 57, y: 84, width: 8, height: 6 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'left_shin',
    name: 'left_shin',
    displayName: 'Left Shin',
    description: 'The lower leg between the knee and ankle, containing two main bones.',
    includes: ['Tibia bone', 'Fibula bone', 'Shin muscles', 'Calf muscles', 'Lower leg tendons'],
    position: { x: 57, y: 88, width: 7, height: 16 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'left_foot',
    name: 'left_foot',
    displayName: 'Left Foot',
    description: 'The foot including toes, arch, heel, and ankle connection.',
    includes: ['Toes', 'Arch', 'Heel', 'Ankle', 'Foot muscles', 'Plantar fascia', 'Foot bones'],
    position: { x: 57, y: 96, width: 8, height: 6 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  // Back areas 
  {
    id: 'upper_back',
    name: 'upper_back',
    displayName: 'Upper Back',
    description: 'The upper portion of the back including shoulder blades and upper spine.',
    includes: ['Shoulder blades', 'Upper spine', 'Thoracic vertebrae', 'Upper back muscles', 'Rhomboids', 'Latissimus dorsi'],
    position: { x: 15, y: 25, width: 8, height: 12 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  },
  {
    id: 'lower_back',
    name: 'lower_back',
    displayName: 'Lower Back',
    description: 'The lower portion of the back including the lumbar spine and surrounding muscles.',
    includes: ['Lumbar spine', 'Lower back muscles', 'Lumbar vertebrae', 'Sacrum', 'Hip connection', 'Core muscles'],
    position: { x: 85, y: 25, width: 8, height: 12 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 }
  }
];

export const AnatomySelector = ({ onSelectionComplete }: AnatomySelectorProps) => {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [bodyPartsState, setBodyPartsState] = useState(() => 
    bodyParts.map(part => ({ ...part, transform: { rotation: 0, scaleX: 1, scaleY: 1 } }))
  );
  const [activeHandle, setActiveHandle] = useState<{ partId: string; type: 'drag' | 'resize' | 'rotate'; corner?: string } | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; partX: number; partY: number; partWidth?: number; partHeight?: number; partRotation?: number } | null>(null);

  const handleCircleClick = (partId: string) => {
    if (!activeHandle) {
      toggleBodyPart(partId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, partId: string, handleType: 'drag' | 'resize' | 'rotate', corner?: string) => {
    e.stopPropagation();
    const part = bodyPartsState.find(p => p.id === partId);
    if (!part) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = (e.currentTarget.closest('.relative') as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;

    setActiveHandle({ partId, type: handleType, corner });
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      partX: part.position.x,
      partY: part.position.y,
      partWidth: part.position.width,
      partHeight: part.position.height,
      partRotation: part.transform.rotation
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!activeHandle || !dragStart) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setBodyPartsState(prev => prev.map(part => {
      if (part.id !== activeHandle.partId) return part;

      switch (activeHandle.type) {
        case 'drag':
          return {
            ...part,
            position: {
              ...part.position,
              x: Math.max(0, Math.min(100, dragStart.partX + (deltaX / 3))), // Scale movement
              y: Math.max(0, Math.min(100, dragStart.partY + (deltaY / 3)))
            }
          };

        case 'resize':
          const scaleFactorX = 1 + (deltaX / 100);
          const scaleFactorY = 1 + (deltaY / 100);
          return {
            ...part,
            position: {
              ...part.position,
              width: Math.max(2, (dragStart.partWidth || part.position.width) * scaleFactorX),
              height: Math.max(2, (dragStart.partHeight || part.position.height) * scaleFactorY)
            }
          };

        case 'rotate':
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
          return {
            ...part,
            transform: {
              ...part.transform,
              rotation: (dragStart.partRotation || 0) + angle
            }
          };

        default:
          return part;
      }
    }));
  };

  const handleMouseUp = () => {
    setActiveHandle(null);
    setDragStart(null);
  };

  // Add global mouse event listeners
  React.useEffect(() => {
    if (activeHandle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [activeHandle, dragStart]);

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
                {/* Base body image */}
                <img 
                  src="/lovable-uploads/84dea027-e4dd-4221-b5fd-fb9d34bf82f8.png" 
                  alt="Human body silhouette" 
                  className="max-w-full h-auto max-h-[400px] object-contain filter drop-shadow-sm"
                  style={{ maxWidth: '300px' }}
                />
                
                {/* Interactive rectangles with handles */}
                <div className="absolute inset-0 pointer-events-none">
                  {bodyPartsState.map(part => {
                    const isSelected = selectedParts.includes(part.id);
                    const isHovered = hoveredPart === part.id;
                    const isActive = activeHandle?.partId === part.id;
                    
                    return (
                      <div key={part.id} className="absolute pointer-events-auto">
                        {/* Main rectangle */}
                        <div
                          className={`absolute border-2 transition-all duration-200 cursor-move ${
                            isSelected
                              ? 'bg-primary/60 border-primary shadow-lg'
                              : isHovered || isActive
                              ? 'bg-primary/30 border-primary/70 shadow-md'
                              : 'bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50'
                          }`}
                          style={{
                            left: `${part.position.x}%`,
                            top: `${part.position.y}%`,
                            width: `${part.position.width}%`,
                            height: `${part.position.height}%`,
                            transform: `translate(-50%, -50%) rotate(${part.transform.rotation}deg) scale(${part.transform.scaleX}, ${part.transform.scaleY})`,
                            borderRadius: '8px'
                          }}
                          onClick={() => handleCircleClick(part.id)}
                          onMouseDown={(e) => handleMouseDown(e, part.id, 'drag')}
                          onMouseEnter={() => setHoveredPart(part.id)}
                          onMouseLeave={() => setHoveredPart(null)}
                          title={part.displayName}
                        >
                          {/* Resize handles (show when selected or active) */}
                          {(isSelected || isActive) && (
                            <>
                              {/* Corner resize handles */}
                              <div 
                                className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-nw-resize -top-1 -left-1"
                                onMouseDown={(e) => handleMouseDown(e, part.id, 'resize', 'nw')}
                              />
                              <div 
                                className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-ne-resize -top-1 -right-1"
                                onMouseDown={(e) => handleMouseDown(e, part.id, 'resize', 'ne')}
                              />
                              <div 
                                className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-sw-resize -bottom-1 -left-1"
                                onMouseDown={(e) => handleMouseDown(e, part.id, 'resize', 'sw')}
                              />
                              <div 
                                className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-se-resize -bottom-1 -right-1"
                                onMouseDown={(e) => handleMouseDown(e, part.id, 'resize', 'se')}
                              />
                              
                              {/* Rotation handle */}
                              <div 
                                className="absolute w-4 h-4 bg-green-500 border-2 border-background rounded-full cursor-pointer"
                                style={{ top: '-20px', left: '50%', transform: 'translateX(-50%)' }}
                                onMouseDown={(e) => handleMouseDown(e, part.id, 'rotate')}
                                title="Rotate"
                              />
                              
                              {/* Part label */}
                              <div className="absolute top-0 left-0 bg-background/90 text-foreground text-xs px-1 rounded transform -translate-y-full whitespace-nowrap">
                                {part.displayName}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Debug Panel */}
                {showDebug && (
                  <div className="absolute top-4 right-4 bg-background/95 backdrop-blur p-4 rounded-lg border shadow-lg max-h-96 overflow-y-auto w-80">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-sm">Debug Panel</h3>
                      <button 
                        onClick={() => setShowDebug(false)}
                        className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                      >
                        Hide
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="mb-2">
                        <button 
                          onClick={() => {
                            console.log('=== ANATOMY SELECTOR DEBUG DATA ===');
                            bodyPartsState.forEach(part => {
                              console.log(`${part.id}:`, {
                                position: part.position,
                                transform: part.transform
                              });
                            });
                          }}
                          className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs hover:bg-primary/90"
                        >
                          Log All Positions
                        </button>
                      </div>
                      
                      {bodyPartsState.map(part => (
                        <div key={part.id} className={`p-2 rounded border-l-2 ${
                          selectedParts.includes(part.id) ? 'border-primary bg-primary/10' : 'border-muted'
                        }`}>
                          <div className="font-medium">{part.displayName}</div>
                          <div className="text-muted-foreground">
                            <div>x: {part.position.x.toFixed(1)}%, y: {part.position.y.toFixed(1)}%</div>
                            <div>w: {part.position.width.toFixed(1)}%, h: {part.position.height.toFixed(1)}%</div>
                            <div>rotation: {part.transform.rotation.toFixed(1)}°</div>
                            <div>scale: {part.transform.scaleX.toFixed(2)}, {part.transform.scaleY.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Debug Toggle (if hidden) */}
                {!showDebug && (
                  <button 
                    onClick={() => setShowDebug(true)}
                    className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded hover:bg-primary/90"
                  >
                    Show Debug
                  </button>
                )}
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
