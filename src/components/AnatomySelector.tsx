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
  position: { x: number; y: number; radius: number }; // Circle position and size (percentages of container)
}

const bodyParts: BodyPart[] = [
  {
    id: 'head',
    name: 'head',
    displayName: 'Head & Neck',
    description: 'The head and neck region encompasses all areas from the top of the skull down to the base of the neck.',
    includes: ['Forehead', 'Temples', 'Scalp', 'Face', 'Jaw', 'Ears', 'Eyes', 'Nose', 'Throat', 'Neck muscles', 'Cervical spine'],
    position: { x: 44, y: 14, radius: 8 }
  },
  {
    id: 'chest',
    name: 'chest', 
    displayName: 'Chest',
    description: 'The chest area includes the upper torso, ribcage, and organs within the thoracic cavity.',
    includes: ['Upper chest', 'Lower chest', 'Ribs', 'Sternum', 'Heart area', 'Lung area', 'Breast area', 'Intercostal muscles'],
    position: { x: 45, y: 32, radius: 10 }
  },
  {
    id: 'abdomen',
    name: 'abdomen',
    displayName: 'Abdomen',
    description: 'The abdominal region contains digestive organs and extends from below the ribs to the pelvis.',
    includes: ['Upper abdomen', 'Lower abdomen', 'Stomach area', 'Sides (flanks)', 'Navel area', 'Digestive organs', 'Abdominal muscles'],
    position: { x: 45, y: 49, radius: 10 }
  },
  {
    id: 'pelvis',
    name: 'pelvis',
    displayName: 'Pelvis & Hips',
    description: 'The pelvic region includes the hip bones, reproductive organs, and lower abdominal structures.',
    includes: ['Hip bones', 'Groin area', 'Reproductive organs', 'Bladder area', 'Lower back connection', 'Pelvic muscles'],
    position: { x: 45, y: 64, radius: 10 }
  }
];

export const AnatomySelector = ({ onSelectionComplete }: AnatomySelectorProps) => {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [bodyPartsState, setBodyPartsState] = useState(() => 
    bodyParts.map(part => ({ ...part }))
  );
  const [activeHandle, setActiveHandle] = useState<{ partId: string; type: 'drag' | 'resize' } | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; partX: number; partY: number; partRadius?: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleCircleClick = (partId: string) => {
    if (!activeHandle) {
      toggleBodyPart(partId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, partId: string, handleType: 'drag' | 'resize') => {
    e.stopPropagation();
    const part = bodyPartsState.find(p => p.id === partId);
    if (!part) return;

    setActiveHandle({ partId, type: handleType });
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      partX: part.position.x,
      partY: part.position.y,
      partRadius: part.position.radius
    });
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (activeHandle) return; // Don't add new circles while dragging
    
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Create a new body part
    const newId = `custom_${Date.now()}`;
    const newPart: BodyPart = {
      id: newId,
      name: newId,
      displayName: `Custom Area ${bodyPartsState.length + 1}`,
      description: 'Custom selected area',
      includes: ['Custom area'],
      position: { x, y, radius: 5 }
    };
    
    setBodyPartsState(prev => [...prev, newPart]);
    setSelectedParts(prev => [...prev, newId]);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!activeHandle || !dragStart || !overlayRef.current) return;

    const containerRect = overlayRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Convert pixel movements to percentage movements
    const deltaXPercent = (deltaX / containerRect.width) * 100;
    const deltaYPercent = (deltaY / containerRect.height) * 100;
    
    setBodyPartsState(prev => prev.map(part => {
      if (part.id !== activeHandle.partId) return part;

      switch (activeHandle.type) {
        case 'drag':
          return {
            ...part,
            position: {
              ...part.position,
              x: Math.max(5, Math.min(95, dragStart.partX + deltaXPercent)),
              y: Math.max(5, Math.min(95, dragStart.partY + deltaYPercent))
            }
          };

        case 'resize':
          const scaleFactor = 1 + (deltaX / 100);
          return {
            ...part,
            position: {
              ...part.position,
              radius: Math.max(2, Math.min(20, (dragStart.partRadius || part.position.radius) * scaleFactor))
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
              <div className="relative inline-block">
                {/* Base body image */}
                <img 
                  ref={imageRef}
                  src="/lovable-uploads/84dea027-e4dd-4221-b5fd-fb9d34bf82f8.png" 
                  alt="Human body silhouette" 
                  className="block filter drop-shadow-sm"
                  style={{ width: '300px', height: 'auto' }}
                />
                
                {/* Interactive circles - matches image dimensions exactly */}
                <div 
                  ref={overlayRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  style={{ width: '300px', height: '600px' }}
                  onClick={handleImageClick}
                >
                  {bodyPartsState.map(part => {
                    const isSelected = selectedParts.includes(part.id);
                    const isHovered = hoveredPart === part.id;
                    const isActive = activeHandle?.partId === part.id;
                    
                    return (
                      <div key={part.id} className="absolute">
                        {/* Main circle */}
                        <div
                          className={`absolute border-2 transition-all duration-200 cursor-move rounded-full ${
                            isSelected
                              ? 'bg-primary/70 border-primary shadow-lg'
                              : isHovered || isActive
                              ? 'bg-primary/50 border-primary/80 shadow-md'
                              : 'bg-primary/30 border-primary/60 hover:bg-primary/40 hover:border-primary/70'
                          }`}
                          style={{
                            left: `${part.position.x - part.position.radius}%`,
                            top: `${part.position.y - part.position.radius}%`,
                            width: `${part.position.radius * 2}%`,
                            height: `${part.position.radius * 2}%`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCircleClick(part.id);
                          }}
                          onMouseDown={(e) => handleMouseDown(e, part.id, 'drag')}
                          onMouseEnter={() => setHoveredPart(part.id)}
                          onMouseLeave={() => setHoveredPart(null)}
                          title={part.displayName}
                        >
                          {/* Resize handle (show when selected or active) */}
                          {(isSelected || isActive) && (
                            <div
                              className="absolute w-3 h-3 bg-white border-2 border-primary rounded-full cursor-pointer"
                              style={{ bottom: '-6px', right: '-6px' }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, part.id, 'resize');
                              }}
                              title="Resize"
                            />
                          )}
                          
                          {/* Part label */}
                          {(isSelected || isHovered || isActive) && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                              {part.displayName}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Debug Panel - Moved to bottom-left */}
                {showDebug && (
                  <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur p-4 rounded-lg border shadow-lg max-h-96 overflow-y-auto w-80">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-sm">Debug Panel (Circles)</h3>
                      <button 
                        onClick={() => setShowDebug(false)}
                        className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                      >
                        Hide
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="mb-2 text-gray-600">
                        Click anywhere on the body image to place a new circle
                      </div>
                      
                      {bodyPartsState.map(part => (
                        <div key={part.id} className={`p-2 rounded border-l-2 ${
                          selectedParts.includes(part.id) ? 'border-primary bg-primary/10' : 'border-muted'
                        }`}>
                          <div className="font-medium">{part.displayName}</div>
                          <div className="text-muted-foreground">
                            <div>Center: ({part.position.x.toFixed(1)}%, {part.position.y.toFixed(1)}%)</div>
                            <div>Radius: {part.position.radius.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                      
                      {activeHandle && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <div><strong>Active Handle:</strong></div>
                          <div>Part: {activeHandle.partId}</div>
                          <div>Type: {activeHandle.type}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Debug Toggle (if hidden) - Moved to bottom-left */}
                {!showDebug && (
                  <button 
                    onClick={() => setShowDebug(true)}
                    className="absolute bottom-4 left-4 bg-primary text-primary-foreground px-3 py-2 rounded hover:bg-primary/90"
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
