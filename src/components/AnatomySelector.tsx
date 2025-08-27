import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { User, ArrowRight, X, Plus, Download, RotateCw } from 'lucide-react';

interface AnatomySelectorProps {
  onSelectionComplete: (selectedParts: string[]) => void;
}

interface Shape {
  id: string;
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage of container width
  height: number; // percentage of container height
  rotation: number; // degrees
}

export const AnatomySelector = ({ onSelectionComplete }: AnatomySelectorProps) => {
  const [shapes, setShapes] = useState<Shape[]>([
    { id: '1', name: 'Head', x: 42, y: 5, width: 15.33, height: 11.67, rotation: 0 },
    { id: '2', name: 'Neck', x: 39.67, y: 17, width: 20, height: 5, rotation: 0 },
    { id: '3', name: 'Upper Torso', x: 39, y: 22.33, width: 22, height: 16.78, rotation: 0 },
    { id: '4', name: 'Lower Torso', x: 36.67, y: 39.22, width: 26, height: 13.67, rotation: 0 },
    { id: '5', name: 'Left Shoulder', x: 61, y: 19.67, width: 10.33, height: 7, rotation: 0 },
    { id: '6', name: 'Right Shoulder', x: 28.67, y: 19.67, width: 10.33, height: 7, rotation: 0 },
    { id: '7', name: 'Left Upper Arm', x: 65.33, y: 26.67, width: 8, height: 12, rotation: 0 },
    { id: '8', name: 'Right Upper Arm', x: 26.67, y: 26.67, width: 8, height: 12, rotation: 0 },
    { id: '9', name: 'Left Elbow', x: 67, y: 38.67, width: 6, height: 4, rotation: 0 },
    { id: '10', name: 'Right Elbow', x: 27, y: 38.67, width: 6, height: 4, rotation: 0 },
    { id: '11', name: 'Left Forearm', x: 69, y: 42.67, width: 7, height: 11, rotation: 0 },
    { id: '12', name: 'Right Forearm', x: 24, y: 42.67, width: 7, height: 11, rotation: 0 },
    { id: '13', name: 'Left Hand', x: 71, y: 53.67, width: 5, height: 6, rotation: 0 },
    { id: '14', name: 'Right Hand', x: 24, y: 53.67, width: 5, height: 6, rotation: 0 },
    { id: '15', name: 'Left Hip', x: 53, y: 52.89, width: 8, height: 6, rotation: 0 },
    { id: '16', name: 'Right Hip', x: 39, y: 52.89, width: 8, height: 6, rotation: 0 },
    { id: '17', name: 'Left Upper Leg', x: 53, y: 58.89, width: 9, height: 15, rotation: 0 },
    { id: '18', name: 'Right Upper Leg', x: 38, y: 58.89, width: 9, height: 15, rotation: 0 },
    { id: '19', name: 'Left Knee', x: 53.5, y: 73.89, width: 8, height: 4, rotation: 0 },
    { id: '20', name: 'Right Knee', x: 38.5, y: 73.89, width: 8, height: 4, rotation: 0 },
    { id: '21', name: 'Left Lower Leg', x: 54, y: 77.89, width: 7, height: 13, rotation: 0 },
    { id: '22', name: 'Right Lower Leg', x: 39, y: 77.89, width: 7, height: 13, rotation: 0 },
    { id: '23', name: 'Left Foot', x: 54.5, y: 90.89, width: 6, height: 5, rotation: 0 },
    { id: '24', name: 'Right Foot', x: 39.5, y: 90.89, width: 6, height: 5, rotation: 0 }
  ]);
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<{ shapeId: string; type: 'drag' | 'resize-width' | 'resize-height' | 'rotate' } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; shapeX: number; shapeY: number; shapeWidth?: number; shapeHeight?: number; shapeRotation?: number } | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update image dimensions when image loads
  useEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current) {
        const { width, height } = imageRef.current.getBoundingClientRect();
        setImageDimensions({ width, height });
      }
    };

    const img = imageRef.current;
    if (img) {
      if (img.complete) {
        updateDimensions();
      } else {
        img.addEventListener('load', updateDimensions);
        return () => img.removeEventListener('load', updateDimensions);
      }
    }
  }, []);

  const createShape = () => {
    const newId = `shape_${Date.now()}`;
    const newShape: Shape = {
      id: newId,
      name: `Shape ${shapes.length + 1}`,
      x: 25,
      y: 25,
      width: 20,
      height: 15,
      rotation: 0
    };
    setShapes(prev => [...prev, newShape]);
    setSelectedShapes(prev => [...prev, newId]);
  };

  const handleShapeClick = (shapeId: string) => {
    if (!activeHandle) {
      toggleShape(shapeId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, shapeId: string, handleType: 'drag' | 'resize-width' | 'resize-height' | 'rotate') => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    setActiveHandle({ shapeId, type: handleType });
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      shapeX: shape.x,
      shapeY: shape.y,
      shapeWidth: shape.width,
      shapeHeight: shape.height,
      shapeRotation: shape.rotation
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!activeHandle || !dragStart || !overlayRef.current) return;

    const containerRect = overlayRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const deltaXPercent = (deltaX / containerRect.width) * 100;
    const deltaYPercent = (deltaY / containerRect.height) * 100;
    
    setShapes(prev => prev.map(shape => {
      if (shape.id !== activeHandle.shapeId) return shape;

      switch (activeHandle.type) {
        case 'drag':
          return {
            ...shape,
            x: Math.max(0, Math.min(100 - shape.width, dragStart.shapeX + deltaXPercent)),
            y: Math.max(0, Math.min(100 - shape.height, dragStart.shapeY + deltaYPercent))
          };
        case 'resize-width':
          return {
            ...shape,
            width: Math.max(5, Math.min(50, (dragStart.shapeWidth || shape.width) + deltaXPercent))
          };
        case 'resize-height':
          return {
            ...shape,
            height: Math.max(5, Math.min(50, (dragStart.shapeHeight || shape.height) + deltaYPercent))
          };
        case 'rotate':
          const rotationDelta = deltaX * 2;
          return {
            ...shape,
            rotation: (dragStart.shapeRotation || 0) + rotationDelta
          };
        default:
          return shape;
      }
    }));
  };

  const handleMouseUp = () => {
    setActiveHandle(null);
    setDragStart(null);
  };

  useEffect(() => {
    if (activeHandle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [activeHandle, dragStart, shapes]);

  const toggleShape = (shapeId: string) => {
    setSelectedShapes(prev => 
      prev.includes(shapeId) 
        ? prev.filter(id => id !== shapeId)
        : [...prev, shapeId]
    );
  };

  const removeShape = (shapeId: string) => {
    setShapes(prev => prev.filter(s => s.id !== shapeId));
    setSelectedShapes(prev => prev.filter(id => id !== shapeId));
  };

  const startNameEdit = (shapeId: string, currentName: string) => {
    setEditingName(shapeId);
    setTempName(currentName);
  };

  const saveNameEdit = () => {
    if (editingName) {
      setShapes(prev => prev.map(shape => 
        shape.id === editingName ? { ...shape, name: tempName } : shape
      ));
      setEditingName(null);
      setTempName('');
    }
  };

  const captureShapes = () => {
    const shapeData = shapes.map(shape => ({
      name: shape.name,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation
    }));
    console.log('Captured shapes:', shapeData);
    alert(`Captured ${shapes.length} shapes - check console for data`);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <Card className="w-full max-w-3xl mx-auto bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
          <CardHeader className="text-center pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Shape Selector</CardTitle>
            </div>
            <div className="flex justify-center gap-2">
              <Button size="sm" onClick={createShape} className="h-7 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Shape
              </Button>
              <Button size="sm" variant="outline" onClick={captureShapes} className="h-7 px-2 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Capture
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDebug(!showDebug)} className="h-7 px-2 text-xs">
                Debug
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex justify-center">
                <div className="relative inline-block">
                  <img 
                    ref={imageRef}
                    src="/lovable-uploads/84dea027-e4dd-4221-b5fd-fb9d34bf82f8.png" 
                    alt="Human body silhouette" 
                    className="block filter drop-shadow-sm"
                    style={{ width: '300px', height: 'auto' }}
                  />
                  
                  <div 
                    ref={overlayRef}
                    className="absolute top-0 left-0"
                    style={imageDimensions ? 
                      { width: `${imageDimensions.width}px`, height: `${imageDimensions.height}px` } : 
                      { width: '300px', height: '600px' }
                    }
                  >
                    {shapes.map(shape => {
                      const isSelected = selectedShapes.includes(shape.id);
                      const isHovered = hoveredShape === shape.id;
                      const isActive = activeHandle?.shapeId === shape.id;
                      
                      return (
                        <div
                          key={shape.id}
                          className={`absolute border-2 transition-all duration-200 cursor-move ${
                            isSelected
                              ? 'bg-primary/70 border-primary shadow-lg'
                              : isHovered || isActive
                              ? 'bg-primary/50 border-primary/80 shadow-md'
                              : 'bg-primary/30 border-primary/60 hover:bg-primary/40 hover:border-primary/70'
                          }`}
                          style={{
                            left: `${shape.x}%`,
                            top: `${shape.y}%`,
                            width: `${shape.width}%`,
                            height: `${shape.height}%`,
                            transform: `rotate(${shape.rotation}deg)`,
                            transformOrigin: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShapeClick(shape.id);
                          }}
                          onMouseDown={(e) => handleMouseDown(e, shape.id, 'drag')}
                          onMouseEnter={() => setHoveredShape(shape.id)}
                          onMouseLeave={() => setHoveredShape(null)}
                          title={shape.name}
                        >
                          {/* Width resize handle */}
                          {(isSelected || isActive) && (
                            <div
                              className="absolute w-2 h-2 bg-white border border-primary rounded-full cursor-ew-resize"
                              style={{ top: '50%', right: '-4px', transform: 'translateY(-50%)' }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, shape.id, 'resize-width');
                              }}
                            />
                          )}
                          
                          {/* Height resize handle */}
                          {(isSelected || isActive) && (
                            <div
                              className="absolute w-2 h-2 bg-white border border-primary rounded-full cursor-ns-resize"
                              style={{ bottom: '-4px', left: '50%', transform: 'translateX(-50%)' }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, shape.id, 'resize-height');
                              }}
                            />
                          )}
                          
                          {/* Rotate handle */}
                          {(isSelected || isActive) && (
                            <div
                              className="absolute w-2 h-2 bg-blue-500 border border-blue-600 rounded-full cursor-crosshair"
                              style={{ top: '-4px', right: '-4px' }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, shape.id, 'rotate');
                              }}
                            />
                          )}
                          
                          {/* Shape label */}
                          {(isSelected || isHovered || isActive) && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap pointer-events-none z-10">
                              {shape.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {showDebug && (
                    <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur p-2 rounded border shadow-lg max-h-48 overflow-y-auto w-64 text-xs">
                      <div className="font-medium mb-2">Debug Panel</div>
                      <div>Shapes: {shapes.length}</div>
                      <div>Image: {imageDimensions?.width || '?'}×{imageDimensions?.height || '?'}px</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Shapes ({shapes.length})</h3>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {shapes.map(shape => (
                        <div key={shape.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                          {editingName === shape.id ? (
                            <Input
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              onBlur={saveNameEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveNameEdit()}
                              className="flex-1 h-6 text-xs"
                              autoFocus
                            />
                          ) : (
                            <div 
                              className="flex-1 text-xs cursor-pointer hover:text-primary"
                              onClick={() => startNameEdit(shape.id, shape.name)}
                            >
                              {shape.name}
                            </div>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => removeShape(shape.id)} className="h-6 w-6 p-0">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => onSelectionComplete(selectedShapes)}
                disabled={selectedShapes.length === 0}
                className="min-w-[200px]"
              >
                Continue with {selectedShapes.length} shape{selectedShapes.length !== 1 ? 's' : ''}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};