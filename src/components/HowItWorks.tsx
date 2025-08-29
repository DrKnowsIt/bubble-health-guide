import { Brain, Filter, CheckCircle, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Brain,
    title: "Multi-Layer Processing",
    description: "Your health or pet care question is processed through our proprietary chain-of-thought architecture, breaking complex queries into structured medical and veterinary reasoning steps.",
    step: "01"
  },
  {
    icon: Filter,
    title: "Hallucination Filtering",
    description: "Our advanced validation system cross-references responses against verified medical and veterinary databases and flags any uncertain information before delivery.",
    step: "02"
  },
  {
    icon: CheckCircle,
    title: "Confidence Scoring",
    description: "Every suggestion includes confidence indicators to help you understand which possibilities to discuss with your doctor or veterinarian first.",
    step: "03"
  },
  {
    icon: ArrowRight,
    title: "Contextual Refinement",
    description: "The AI maintains conversation context and health profiles for your family and pets to provide increasingly personalized and accurate guidance over time.",
    step: "04"
  }
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl mb-4">
            How DrKnowsIt Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our unique architecture processes health and pet care information through multiple validation layers, 
            helping you organize symptoms and prepare thoughtful questions for doctors and veterinarians.
          </p>
        </div>

        {/* Video Demonstration Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              See DrKnowsIt in Action
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Watch how our AI processes health questions and provides structured insights to help you prepare for medical consultations.
            </p>
          </div>
          
          <div className="relative max-w-4xl mx-auto">
            <div className="medical-card p-0 overflow-hidden group cursor-pointer hover:shadow-elevated transition-all duration-300">
              {/* Video Placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground mb-1">
                      Interactive Demo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click to see how DrKnowsIt works
                    </p>
                  </div>
                </div>
                
                {/* Placeholder Content */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Multi-layer processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <span>Real-time validation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-secondary rounded-full"></div>
                      <span>Confidence scoring</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Image and Steps */}
        <div className="grid lg:grid-cols-2 gap-8 items-center mb-16">
          {/* Left side - Doctor Image */}
          <div className="flex justify-center">
            <div className="relative max-w-sm w-full">
              <img 
                src="/lovable-uploads/82b7c835-d673-4823-a50b-9f9acb76779f.png"
                alt="Friendly blue holographic cartoon doctor with medical head mirror, lab coat, and thumbs up gesture, surrounded by medical icons on teal background"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-2xl"></div>
            </div>
          </div>

          {/* Right side - Steps arranged vertically */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative group"
              >
                {/* Vertical Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-6 w-px h-8 bg-border z-0">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                )}
                
                <div className="flex items-start gap-4 medical-card p-4 group-hover:scale-105 transition-all duration-300 relative z-10">
                  <div className="shrink-0">
                    <div className="relative">
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {step.step}
                      </div>
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg gradient-bubble text-white group-hover:shadow-elevated transition-shadow">
                        <step.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="medical-card p-8 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Built for Medical & Veterinary Accuracy
          </h3>
          <p className="text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Our proprietary chain-of-thought processing architecture breaks down complex symptom descriptions for both humans and pets into 
            structured possibilities. Each suggestion is validated against medical and veterinary knowledge bases and scored for 
            likelihood. This helps you prepare informed questions and organize your thoughts before consulting with 
            healthcare professionals and veterinarians for proper diagnosis and treatment.
          </p>
        </div>
      </div>
    </section>
  );
};