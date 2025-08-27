import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    frontDescription: 'The head contains the brain (central nervous system control center), eyes (vision and visual processing), nose (respiratory entry and smell), mouth (digestion start, speech), facial muscles (expression and chewing), paranasal sinuses (air-filled spaces that lighten skull weight), temporomandibular joint (jaw movement), and cranial nerves (12 pairs controlling various head functions).',
    backDescription: 'The back of the skull houses the occipital lobe (visual processing center), cerebellum (balance and coordination), brainstem (vital functions like breathing and heart rate), occipital bone (skull protection), neck muscle attachments (head movement and support), and the atlas-axis joint complex (head rotation and nodding movements).'
  },
  { 
    id: '2', 
    name: 'Neck', 
    x: 39.67, y: 17, width: 20, height: 5,
    frontDescription: 'The neck contains the trachea (airway to lungs), esophagus (food passage to stomach), thyroid gland (metabolism regulation), parathyroid glands (calcium regulation), major blood vessels (carotid arteries and jugular veins), lymph nodes (immune system filtering), and vocal cords (speech production). The cervical spine provides structural support.',
    backDescription: 'The posterior neck houses the cervical vertebrae (C1-C7), spinal cord continuation from brain, cervical muscles (head movement and support), ligamentum nuchae (neck stability), suboccipital muscles (fine head movements), and nerve pathways including the accessory nerve and cervical nerve roots.'
  },
  { 
    id: '3', 
    name: 'Upper Torso', 
    x: 39, y: 22.33, width: 22, height: 11,
    frontDescription: 'The upper torso contains the heart (blood circulation pump), lungs (oxygen exchange), major vessels (aorta, vena cava, pulmonary arteries/veins), pectoralis muscles (arm movement), intercostal muscles (breathing assistance), ribs (lung protection), sternum (chest bone), and in females, mammary glands (breast tissue with milk ducts).',
    backDescription: 'The upper back includes the thoracic spine (T1-T6), scapulae (shoulder blades), rhomboids and trapezius muscles (shoulder stability), posterior lung surfaces, esophagus continuation, and the sympathetic nerve chain. The latissimus dorsi muscles attach here for arm movement.'
  },
  { 
    id: '25', 
    name: 'Mid Torso', 
    x: 38, y: 33.33, width: 24, height: 5.67,
    frontDescription: 'The mid torso houses the stomach (food digestion), liver (detoxification, protein synthesis, bile production), gallbladder (bile storage), pancreas (insulin production, digestive enzymes), spleen (blood filtering, immune function), diaphragm (primary breathing muscle), and lower ribs (organ protection).',
    backDescription: 'The middle back contains the thoracolumbar spine (T7-L2), kidneys (blood filtration, electrolyte balance), adrenal glands (stress hormones, blood pressure regulation), posterior diaphragm attachments, erector spinae muscles (spine support), and the quadratus lumborum muscle (core stability).'
  },
  { 
    id: '4', 
    name: 'Lower Torso', 
    x: 36.67, y: 39, width: 26, height: 13.67,
    frontDescription: 'The lower torso contains the small intestine (nutrient absorption), large intestine/colon (water absorption, waste formation), bladder (urine storage), reproductive organs (uterus/ovaries in females, prostate in males), appendix (immune tissue), pelvic bones (support structure), and abdominal muscles (core strength, organ protection).',
    backDescription: 'The lower back and pelvis include the lumbar spine (L3-L5), sacrum and coccyx (tailbone), gluteal muscle attachments, pelvic floor muscles (organ support), sacroiliac joints (pelvic stability), and major nerve routes including the sciatic nerve origins.'
  },
  { 
    id: '5', 
    name: 'Left Shoulder', 
    x: 61, y: 19.67, width: 10.33, height: 7,
    frontDescription: 'The left shoulder includes the glenohumeral joint (ball and socket), deltoid muscle (arm lifting), clavicle (collar bone), rotator cuff muscles (shoulder stability and rotation), subacromial bursa (friction reduction), and the brachial plexus nerve network (arm nerve supply).',
    backDescription: 'The posterior left shoulder contains the scapula (shoulder blade), posterior deltoid (arm extension), upper trapezius (shoulder elevation), rhomboid muscles (scapular retraction), infraspinatus and teres minor (external rotation), and suprascapular nerve pathways.'
  },
  { 
    id: '6', 
    name: 'Right Shoulder', 
    x: 28.67, y: 19.67, width: 10.33, height: 7,
    frontDescription: 'The right shoulder includes the glenohumeral joint (ball and socket), deltoid muscle (arm lifting), clavicle (collar bone), rotator cuff muscles (shoulder stability and rotation), subacromial bursa (friction reduction), and the brachial plexus nerve network (arm nerve supply).',
    backDescription: 'The posterior right shoulder contains the scapula (shoulder blade), posterior deltoid (arm extension), upper trapezius (shoulder elevation), rhomboid muscles (scapular retraction), infraspinatus and teres minor (external rotation), and suprascapular nerve pathways.'
  },
  { 
    id: '7', 
    name: 'Left Upper Arm', 
    x: 63.83, y: 26.67, width: 8, height: 12,
    frontDescription: 'The left upper arm contains the humerus bone (arm support structure), biceps brachii (elbow flexion, forearm supination), brachialis muscle (elbow flexion), brachial artery (main arm blood supply), median and ulnar nerves (hand sensation and movement), and lymph nodes (immune filtering).',
    backDescription: 'The posterior left upper arm houses the triceps brachii (elbow extension), posterior humerus, radial nerve (wrist and finger extension), profunda brachii artery (deep arm circulation), and intermuscular septae (muscle compartment divisions).'
  },
  { 
    id: '8', 
    name: 'Right Upper Arm', 
    x: 28.17, y: 26.67, width: 8, height: 12,
    frontDescription: 'The right upper arm contains the humerus bone (arm support structure), biceps brachii (elbow flexion, forearm supination), brachialis muscle (elbow flexion), brachial artery (main arm blood supply), median and ulnar nerves (hand sensation and movement), and lymph nodes (immune filtering).',
    backDescription: 'The posterior right upper arm houses the triceps brachii (elbow extension), posterior humerus, radial nerve (wrist and finger extension), profunda brachii artery (deep arm circulation), and intermuscular septae (muscle compartment divisions).'
  },
  { 
    id: '9', 
    name: 'Left Elbow', 
    x: 65.5, y: 38.67, width: 6, height: 4,
    frontDescription: 'The left elbow includes the humeroulnar and humeroradial joints (elbow flexion/extension), ulnar nerve (little finger sensation), brachial tendons (muscle attachments), olecranon bursa (friction reduction), and collateral ligaments (joint stability).',
    backDescription: 'The posterior left elbow contains the olecranon process (elbow tip), triceps insertion, posterior elbow capsule, and the cubital tunnel (ulnar nerve pathway), along with anconeus muscle (elbow extension assistance).'
  },
  { 
    id: '10', 
    name: 'Right Elbow', 
    x: 28.5, y: 38.67, width: 6, height: 4,
    frontDescription: 'The right elbow includes the humeroulnar and humeroradial joints (elbow flexion/extension), ulnar nerve (little finger sensation), brachial tendons (muscle attachments), olecranon bursa (friction reduction), and collateral ligaments (joint stability).',
    backDescription: 'The posterior right elbow contains the olecranon process (elbow tip), triceps insertion, posterior elbow capsule, and the cubital tunnel (ulnar nerve pathway), along with anconeus muscle (elbow extension assistance).'
  },
  { 
    id: '11', 
    name: 'Left Forearm', 
    x: 67.5, y: 42.67, width: 7, height: 9,
    frontDescription: 'The left forearm contains the radius and ulna bones (forearm structure), flexor muscles (wrist and finger bending), radial and ulnar arteries (blood supply), median nerve (thumb sensation), interosseous membrane (bone connection), and carpal tunnel entrance.',
    backDescription: 'The posterior left forearm houses the extensor muscles (wrist and finger straightening), posterior interosseous nerve (muscle control), supinator muscle (forearm rotation), and extensor tendons that control hand and finger extension movements.'
  },
  { 
    id: '12', 
    name: 'Right Forearm', 
    x: 25.5, y: 42.67, width: 7, height: 9,
    frontDescription: 'The right forearm contains the radius and ulna bones (forearm structure), flexor muscles (wrist and finger bending), radial and ulnar arteries (blood supply), median nerve (thumb sensation), interosseous membrane (bone connection), and carpal tunnel entrance.',
    backDescription: 'The posterior right forearm houses the extensor muscles (wrist and finger straightening), posterior interosseous nerve (muscle control), supinator muscle (forearm rotation), and extensor tendons that control hand and finger extension movements.'
  },
  { 
    id: '13', 
    name: 'Left Hand', 
    x: 68.5, y: 50.67, width: 7, height: 8,
    frontDescription: 'The left hand includes five fingers (digit manipulation), palm (grip surface), thumb (opposable digit), metacarpal bones (hand structure), flexor tendons (finger bending), thenar muscles (thumb movement), and palmar aponeurosis (palm stability).',
    backDescription: 'The back of the left hand contains extensor tendons (finger straightening), metacarpal bones (dorsal surface), interosseous muscles (finger spreading), knuckles (metacarpophalangeal joints), and dorsal veins (blood return).'
  },
  { 
    id: '14', 
    name: 'Right Hand', 
    x: 24.5, y: 50.67, width: 7, height: 8,
    frontDescription: 'The right hand includes five fingers (digit manipulation), palm (grip surface), thumb (opposable digit), metacarpal bones (hand structure), flexor tendons (finger bending), thenar muscles (thumb movement), and palmar aponeurosis (palm stability).',
    backDescription: 'The back of the right hand contains extensor tendons (finger straightening), metacarpal bones (dorsal surface), interosseous muscles (finger spreading), knuckles (metacarpophalangeal joints), and dorsal veins (blood return).'
  },
  { 
    id: '15', 
    name: 'Left Hip', 
    x: 53, y: 52.89, width: 8, height: 6,
    frontDescription: 'The left hip contains the acetabulofemoral joint (ball and socket), hip flexor muscles (leg lifting), femoral artery (main leg blood supply), inguinal lymph nodes (immune filtering), greater trochanter (muscle attachment site), and the inguinal canal (containing important vessels and nerves).',
    backDescription: 'The posterior left hip houses the gluteal muscles (hip extension, walking power), piriformis muscle (hip rotation), sciatic nerve (leg sensation and movement), sacroiliac joint (pelvic stability), and hip joint capsule (joint protection and fluid production).'
  },
  { 
    id: '16', 
    name: 'Right Hip', 
    x: 39, y: 52.89, width: 8, height: 6,
    frontDescription: 'The right hip contains the acetabulofemoral joint (ball and socket), hip flexor muscles (leg lifting), femoral artery (main leg blood supply), inguinal lymph nodes (immune filtering), greater trochanter (muscle attachment site), and the inguinal canal (containing important vessels and nerves).',
    backDescription: 'The posterior right hip houses the gluteal muscles (hip extension, walking power), piriformis muscle (hip rotation), sciatic nerve (leg sensation and movement), sacroiliac joint (pelvic stability), and hip joint capsule (joint protection and fluid production).'
  },
  { 
    id: '17', 
    name: 'Left Upper Leg', 
    x: 53, y: 58.89, width: 9, height: 15,
    frontDescription: 'The left thigh contains the femur bone (longest bone in body), quadriceps muscles (knee extension, walking), femoral vein (blood return), adductor muscles (leg inward movement), femoral nerve (thigh sensation), sartorius muscle (hip and knee flexion), and vastus muscles (knee stability).',
    backDescription: 'The posterior left thigh houses the hamstring muscles (knee flexion, hip extension), posterior femur, sciatic nerve continuation (leg and foot control), popliteal vessels (knee area blood supply), and biceps femoris, semitendinosus, and semimembranosus muscles.'
  },
  { 
    id: '18', 
    name: 'Right Upper Leg', 
    x: 38, y: 58.89, width: 9, height: 15,
    frontDescription: 'The right thigh contains the femur bone (longest bone in body), quadriceps muscles (knee extension, walking), femoral vein (blood return), adductor muscles (leg inward movement), femoral nerve (thigh sensation), sartorius muscle (hip and knee flexion), and vastus muscles (knee stability).',
    backDescription: 'The posterior right thigh houses the hamstring muscles (knee flexion, hip extension), posterior femur, sciatic nerve continuation (leg and foot control), popliteal vessels (knee area blood supply), and biceps femoris, semitendinosus, and semimembranosus muscles.'
  },
  { 
    id: '19', 
    name: 'Left Knee', 
    x: 53.5, y: 73.89, width: 8, height: 4,
    frontDescription: 'The left knee includes the patella (kneecap protection), patellar tendon (quadriceps attachment), tibiofemoral joint (main knee joint), menisci (cartilage shock absorbers), anterior and posterior cruciate ligaments (knee stability), and collateral ligaments (side-to-side stability).',
    backDescription: 'The posterior left knee contains the popliteal fossa (diamond-shaped space), popliteal artery and vein (leg circulation), posterior cruciate ligament (backward stability), gastrocnemius muscle origins (calf muscle attachments), and popliteal lymph nodes.'
  },
  { 
    id: '20', 
    name: 'Right Knee', 
    x: 38.5, y: 73.89, width: 8, height: 4,
    frontDescription: 'The right knee includes the patella (kneecap protection), patellar tendon (quadriceps attachment), tibiofemoral joint (main knee joint), menisci (cartilage shock absorbers), anterior and posterior cruciate ligaments (knee stability), and collateral ligaments (side-to-side stability).',
    backDescription: 'The posterior right knee contains the popliteal fossa (diamond-shaped space), popliteal artery and vein (leg circulation), posterior cruciate ligament (backward stability), gastrocnemius muscle origins (calf muscle attachments), and popliteal lymph nodes.'
  },
  { 
    id: '21', 
    name: 'Left Lower Leg', 
    x: 54, y: 77.89, width: 7, height: 13,
    frontDescription: 'The left lower leg contains the tibia (shin bone, weight bearing), fibula (smaller bone, muscle attachment), anterior tibialis (foot lifting), gastrocnemius and soleus (calf muscles for walking), peroneal muscles (foot eversion), anterior tibial artery (blood supply), and deep peroneal nerve (foot sensation).',
    backDescription: 'The posterior left lower leg houses the triceps surae (calf muscle complex), Achilles tendon (heel attachment), posterior tibial vessels (circulation), tibial nerve (foot control), flexor muscles (toe bending), and posterior compartment muscles (plantarflexion).'
  },
  { 
    id: '22', 
    name: 'Right Lower Leg', 
    x: 39, y: 77.89, width: 7, height: 13,
    frontDescription: 'The right lower leg contains the tibia (shin bone, weight bearing), fibula (smaller bone, muscle attachment), anterior tibialis (foot lifting), gastrocnemius and soleus (calf muscles for walking), peroneal muscles (foot eversion), anterior tibial artery (blood supply), and deep peroneal nerve (foot sensation).',
    backDescription: 'The posterior right lower leg houses the triceps surae (calf muscle complex), Achilles tendon (heel attachment), posterior tibial vessels (circulation), tibial nerve (foot control), flexor muscles (toe bending), and posterior compartment muscles (plantarflexion).'
  },
  { 
    id: '23', 
    name: 'Left Foot', 
    x: 54.5, y: 90.89, width: 6, height: 5,
    frontDescription: 'The left foot includes five toes (balance and propulsion), tarsal bones (ankle and midfoot structure), metatarsals (forefoot bones), plantar fascia (arch support), ankle joint (up/down movement), foot arches (shock absorption), and intrinsic foot muscles (fine toe movements).',
    backDescription: 'The posterior left foot contains the heel bone (calcaneus), Achilles tendon insertion (calf muscle attachment), plantar muscles (arch support), heel fat pad (shock absorption), posterior tibial tendon (arch maintenance), and flexor tendons (toe bending control).'
  },
  { 
    id: '24', 
    name: 'Right Foot', 
    x: 39.5, y: 90.89, width: 6, height: 5,
    frontDescription: 'The right foot includes five toes (balance and propulsion), tarsal bones (ankle and midfoot structure), metatarsals (forefoot bones), plantar fascia (arch support), ankle joint (up/down movement), foot arches (shock absorption), and intrinsic foot muscles (fine toe movements).',
    backDescription: 'The posterior right foot contains the heel bone (calcaneus), Achilles tendon insertion (calf muscle attachment), plantar muscles (arch support), heel fat pad (shock absorption), posterior tibial tendon (arch maintenance), and flexor tendons (toe bending control).'
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
        <Card className="w-full max-w-6xl mx-auto bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
          <CardHeader className="text-center pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Select Body Parts</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Click on body parts to select them for analysis
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6">
              {/* Left Column - Body Image */}
              <div className="flex justify-center">
                <div className="relative inline-block">
                  {/* View Toggle */}
                  <div 
                    className="absolute top-2 left-2 z-30 flex items-center gap-2 bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm cursor-pointer hover:bg-background/90 transition-colors"
                    onClick={toggleView}
                  >
                    <span className="text-sm font-medium">{currentView === 'front' ? 'Front View' : 'Back View'}</span>
                    <RotateCcw className="h-3 w-3" />
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
                      
                      return (
                        <div
                          key={part.id}
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
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column - Information Sidebar - Fixed Width */}
              <div className="space-y-4 min-h-[600px]">
                {/* Current Part Info */}
                {(hoveredPart || selectedParts.length > 0) && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    {hoveredPart && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-primary mb-2">Currently Viewing</h3>
                        {(() => {
                          const part = BODY_PARTS.find(p => p.id === hoveredPart);
                          if (!part) return null;
                          const description = currentView === 'front' ? part.frontDescription : part.backDescription;
                          return (
                            <div className="space-y-2">
                              <h4 className="font-medium">{part.name} ({currentView === 'front' ? 'Front' : 'Back'} View)</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {description}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {selectedParts.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-primary mb-3">Selected Body Parts ({selectedParts.length})</h3>
                        <div className="space-y-3">
                          {selectedParts.map(partId => {
                            const part = BODY_PARTS.find(p => p.id === partId);
                            if (!part) return null;
                            const description = currentView === 'front' ? part.frontDescription : part.backDescription;
                            return (
                              <div 
                                key={partId} 
                                className="bg-background/60 rounded-lg p-3 border cursor-pointer hover:bg-background/80 transition-colors"
                                onClick={() => toggleBodyPart(partId)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-sm">{part.name}</h4>
                                  <span className="text-xs text-muted-foreground hover:text-destructive">Remove ×</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions */}
                {!hoveredPart && selectedParts.length === 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="font-medium mb-2">How to Use</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Hover over body parts to see detailed anatomical information</p>
                      <p>• Click to select multiple body parts for analysis</p>
                      <p>• Use the toggle button to switch between front and back views</p>
                      <p>• Selected parts will show detailed descriptions here</p>
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <div className="pt-4">
                  <Button
                    onClick={() => onSelectionComplete(selectedParts)}
                    disabled={selectedParts.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    Continue with {selectedParts.length} body part{selectedParts.length !== 1 ? 's' : ''}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};