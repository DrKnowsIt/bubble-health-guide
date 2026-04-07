import { ReactNode, useState, useEffect } from 'react';
import { 
  MessageCircle, Mic, FileText, Users, Shield, Zap, CheckCircle,
  Brain, Filter, ArrowRight, Stethoscope, Heart, Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";

// ============= EmptyStateMessage Component =============
interface EmptyStateMessageProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export const EmptyStateMessage = ({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction, 
  children 
}: EmptyStateMessageProps) => {
  return (
    <Card className="text-center py-8">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-md mx-auto">
          {description}
        </CardDescription>
      </CardHeader>
      {(actionLabel || children) && (
        <CardContent>
          {actionLabel && onAction && (
            <Button onClick={onAction} className="mb-4">
              {actionLabel}
            </Button>
          )}
          {children}
        </CardContent>
      )}
    </Card>
  );
};

// ============= UserCountBadge Component =============
interface UserCountBadgeProps {
  variant?: 'hero' | 'cta';
  className?: string;
}

export const UserCountBadge = ({ variant = 'cta', className = '' }: UserCountBadgeProps) => {
  const { userCount, loading } = useProfile();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-5 bg-muted rounded w-28"></div>
      </div>
    );
  }

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.floor(count / 100) / 10}k+`;
    }
    return `${count}+`;
  };

  if (userCount === 0) {
    if (variant === 'hero') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 rounded-full border border-primary/15 text-xs font-medium text-primary ${className}`}>
          <Zap className="h-3.5 w-3.5" />
          <span>Now available — be among the first to try DrKnowsIt</span>
        </div>
      );
    }
    return null;
  }

  if (variant === 'hero') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 rounded-full border border-primary/15 text-xs font-medium text-primary ${className}`}>
        <Users className="h-3.5 w-3.5" />
        <span>Join {formatCount(userCount)} families using DrKnowsIt</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 text-sm font-medium text-muted-foreground ${className}`}>
      <Users className="h-3.5 w-3.5 text-primary" />
      <span>
        Trusted by <span className="text-primary font-semibold">{formatCount(userCount)} families</span>
      </span>
    </div>
  );
};

// ============= Features Component =============
const features = [{
  icon: MessageCircle,
  title: "AI Health Analysis",
  description: "Analyzes symptoms using the latest medical knowledge with personalized insights for humans and pets.",
  highlight: "Basic+",
  benefits: ["Smart symptom analysis", "Evidence-based insights", "Personalized recommendations"]
}, {
  icon: Mic,
  title: "Multi-Modal Input",
  description: "Speak or type your concerns naturally — DrKnowsIt understands both and provides tailored analysis.",
  highlight: "Pro",
  benefits: ["Advanced voice recognition", "Natural speech processing", "Text & voice input"]
}, {
  icon: FileText,
  title: "Smart Health Profiles",
  description: "Builds health histories for your family and pets, tracking patterns and medications over time.",
  highlight: "Pro",
  benefits: ["Pattern recognition", "Medication tracking", "Family & pet profiles"]
}, {
  icon: Users,
  title: "Appointment Optimizer",
  description: "Generates organized summaries and targeted questions so you make the most of every visit.",
  highlight: "Basic+",
  benefits: ["Professional summaries", "Targeted questions", "Visit preparation"]
}, {
  icon: Shield,
  title: "Enterprise Security",
  description: "Bank-level encryption keeps your health data private. Zero data sharing, fully secured.",
  highlight: "Basic+",
  benefits: ["Bank-level encryption", "Private conversations", "Secure infrastructure"]
}, {
  icon: Zap,
  title: "Contextual Memory",
  description: "Remembers your health journey and connects past conversations for increasingly relevant insights.",
  highlight: "Pro",
  benefits: ["Conversation memory", "Connected insights", "Evolving understanding"]
}];

export const Features = () => {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4 tracking-tight">
            Why Choose DrKnowsIt?
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-normal">
            Advanced AI combined with healthcare and veterinary expertise for personalized guidance and seamless provider communication.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <Card key={index} className="group bg-card/80 backdrop-blur border border-border hover:border-primary/25 shadow-sm hover:shadow-card transition-all duration-300" style={{
              animationDelay: `${index * 0.1}s`
            }}>
              <CardContent className="p-6">
                {/* Icon and Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-md">
                    {feature.highlight}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Benefits — inline dots */}
                <p className="text-xs text-muted-foreground/70">
                  {feature.benefits.join(' · ')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Card className="inline-block max-w-2xl w-full p-6 bg-card border-primary/15">
            <CardContent className="p-0">
              <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">
                Ready to Transform Your Healthcare Experience?
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                Join our early users building the future of AI-powered healthcare communication.
              </p>
              <Button size="lg" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Get Started Free <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
              <div className="mt-4">
                <UserCountBadge variant="cta" className="justify-center" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

// ============= HowItWorks Component =============
const steps = [
  {
    icon: Brain,
    title: "Multi-Layer Processing",
    description: "Your query is processed through chain-of-thought architecture, breaking complex questions into structured medical reasoning steps.",
    step: "01"
  },
  {
    icon: Filter,
    title: "Hallucination Filtering",
    description: "Advanced validation cross-references responses against verified medical databases and flags uncertain information.",
    step: "02"
  },
  {
    icon: CheckCircle,
    title: "Confidence Scoring",
    description: "Every suggestion includes confidence indicators to help prioritize which possibilities to discuss with your provider.",
    step: "03"
  },
  {
    icon: ArrowRight,
    title: "Contextual Refinement",
    description: "The AI maintains context and health profiles to provide increasingly personalized guidance over time.",
    step: "04"
  }
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-3 tracking-tight">
            How DrKnowsIt Works
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-normal">
            Multiple validation layers process health information, helping you organize symptoms and prepare thoughtful questions for your providers.
          </p>
        </div>

        {/* Main Content with Image and Steps */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
          {/* Left side - Doctor Image */}
          <div className="flex justify-center">
            <div className="relative max-w-xs w-full">
              <img 
                src="/lovable-uploads/82b7c835-d673-4823-a50b-9f9acb76779f.png"
                alt="Friendly blue holographic cartoon doctor with medical head mirror, lab coat, and thumbs up gesture, surrounded by medical icons on teal background"
                className="w-full h-auto rounded-xl shadow-lg border border-border/50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/15 to-transparent rounded-xl"></div>
            </div>
          </div>

          {/* Right side - Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative group"
              >
                {/* Vertical Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-14 left-5 w-px h-6 bg-border z-0"></div>
                )}
                
                <div className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all duration-200 relative z-10">
                  <div className="shrink-0 relative">
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold">
                      {step.step}
                    </div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-card border border-border rounded-xl p-6 text-center max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-foreground mb-2 tracking-tight">
            Built for Medical & Veterinary Accuracy
          </h3>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-normal mb-4">
            Every suggestion is validated against medical knowledge bases and scored for likelihood, helping you prepare informed questions.
          </p>
          <div className="flex flex-wrap justify-center gap-5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Multi-layer validation</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span>Confidence scoring</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5 text-primary" />
              <span>Human & veterinary focus</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============= Footer Component =============
export const Footer = ({ onSignUp }: { onSignUp?: () => void }) => {
  const isMobile = useIsMobile();
  
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Stethoscope className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">DrKnowsIt</div>
                  <div className="text-[10px] text-muted-foreground">AI Medical Guidance</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-powered medical guidance to make informed health decisions 
                and improve communication with healthcare providers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Product</h3>
               <ul className="space-y-2.5 text-xs">
                  <li>
                    {isMobile ? (
                      <Dialog>
                        <DialogTrigger className="text-muted-foreground hover:text-primary transition-smooth text-left">
                          Features
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>DrKnowsIt Features</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold text-primary mb-2">🔍 AI-Powered Health Analysis</h4>
                                <p className="text-sm text-muted-foreground">Get personalized insights from your symptoms and health data using advanced AI technology.</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-primary mb-2">💬 Interactive Medical Chat</h4>
                                <p className="text-sm text-muted-foreground">Ask questions about your health in natural language and receive detailed, informative responses.</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-primary mb-2">📋 Comprehensive Health Records</h4>
                                <p className="text-sm text-muted-foreground">Maintain detailed health profiles with medical history, medications, and ongoing conditions.</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-primary mb-2">🔒 Privacy & Security</h4>
                                <p className="text-sm text-muted-foreground">Your health data is encrypted and securely stored with enterprise-grade security measures.</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-primary mb-2">📱 Mobile Optimized</h4>
                                <p className="text-sm text-muted-foreground">Access your health guidance anywhere with our responsive mobile interface.</p>
                              </div>
                            </div>
                            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                              <p className="text-xs text-warning font-medium">
                                ⚠️ DrKnowsIt is for informational purposes only and not a substitute for professional medical advice, diagnosis, or treatment.
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Link 
                        to="/#features" 
                        className="text-muted-foreground hover:text-primary transition-smooth"
                      >
                        Features
                      </Link>
                    )}
                  </li>
                 <li>
                   <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-smooth">
                     Pricing
                   </Link>
                 </li>
                 <li>
                   {onSignUp ? (
                     <button 
                       onClick={onSignUp}
                       className="text-muted-foreground hover:text-primary transition-smooth text-left"
                     >
                       Try DrKnowsIt
                     </button>
                   ) : (
                     <Link to="/" className="text-muted-foreground hover:text-primary transition-smooth">
                       Try DrKnowsIt
                     </Link>
                   )}
                 </li>
               </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Support</h3>
               <ul className="space-y-2.5 text-xs">
                 <li>
                   <Link to="/faq" className="text-muted-foreground hover:text-primary transition-smooth">
                     Help Center
                   </Link>
                 </li>
                 <li>
                   <Link to="/medical-disclaimer" className="text-muted-foreground hover:text-primary transition-smooth">
                     Medical Disclaimers
                   </Link>
                 </li>
                  <li>
                    <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-smooth">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-muted-foreground hover:text-primary transition-smooth">
                      Terms of Service
                    </Link>
                  </li>
               </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Contact</h3>
               <ul className="space-y-2.5 text-xs">
                 <li className="flex items-center space-x-2">
                   <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                   <a href="mailto:support@drknowit.com" className="text-muted-foreground hover:text-primary transition-smooth">
                     support@drknowit.com
                   </a>
                 </li>
                 <li className="flex items-center space-x-2 text-muted-foreground">
                   <Shield className="h-3.5 w-3.5" />
                   <span>Enterprise Security</span>
                 </li>
               </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border py-5">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-2 lg:space-y-0 gap-3">
            <div className="text-xs text-muted-foreground/70 text-center lg:text-left">
              © 2026 DrKnowsIt. All rights reserved.
            </div>
            
            {/* Important Medical Disclaimer */}
            <div className="flex items-center gap-1.5 rounded-md bg-warning/5 border border-warning/15 px-2.5 py-1.5">
              <Heart className="h-3 w-3 text-warning/70 flex-shrink-0" />
              <span className="text-[10px] text-warning/70">
                Not a substitute for professional medical advice
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
