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
        <div className="h-6 bg-muted rounded w-32"></div>
      </div>
    );
  }

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.floor(count / 100) / 10}k+`;
    }
    return `${count}+`;
  };

  if (variant === 'hero') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-primary/20 rounded-full border border-primary/20 text-sm font-medium text-primary ${className}`}>
        <Users className="h-4 w-4" />
        <span>Join {formatCount(userCount)} families using DrKnowsIt</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 text-sm font-medium text-muted-foreground ${className}`}>
      <Users className="h-4 w-4 text-primary" />
      <span>
        Trusted by <span className="text-primary font-semibold">{formatCount(userCount)} families</span> and their pets
      </span>
    </div>
  );
};

// ============= Features Component =============
const features = [{
  icon: MessageCircle,
  title: "AI-Powered Health Analysis",
  description: "Advanced AI analyzes your symptoms and health concerns using the latest medical knowledge, providing personalized insights for both human and pet health to help you communicate more effectively with healthcare providers.",
  highlight: "Basic+",
  benefits: ["Smart symptom analysis", "Evidence-based insights", "Personalized recommendations"]
}, {
  icon: Mic,
  title: "Multi-Modal Intelligence",
  description: "Communicate through text or voice. Speak your concerns naturally or type detailed descriptions - DrKnowsIt understands both and provides comprehensive analysis tailored to your communication style.",
  highlight: "Pro Only",
  benefits: ["Advanced voice recognition", "Natural speech processing", "Text & voice input"]
}, {
  icon: FileText,
  title: "Smart Health Profiles",
  description: "Automatically builds detailed health histories for your entire family and pets, tracking patterns, medications, and symptoms over time to provide better context for healthcare visits.",
  highlight: "Pro Only",
  benefits: ["Pattern recognition", "Medication tracking", "Family & pet profiles"]
}, {
  icon: Users,
  title: "Appointment Optimizer",
  description: "Generates professional, organized summaries and targeted questions for your healthcare visits. Ensures you maximize your limited appointment time and don't forget crucial details.",
  highlight: "Basic+",
  benefits: ["Professional summaries", "Targeted questions", "Visit preparation"]
}, {
  icon: Shield,
  title: "Enterprise Security",
  description: "Bank-level encryption protects your health data. Your conversations remain private with zero data sharing. All processing happens securely within our protected infrastructure.",
  highlight: "Basic+",
  benefits: ["Bank-level encryption", "Private conversations", "Secure infrastructure"]
}, {
  icon: Zap,
  title: "Contextual Memory",
  description: "DrKnowsIt remembers your health journey, connecting past conversations to provide more relevant insights. No need to repeat your medical history - it builds on previous discussions.",
  highlight: "Pro Only",
  benefits: ["Conversation memory", "Connected insights", "Evolving understanding"]
}];

export const Features = () => {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold text-foreground sm:text-5xl mb-6 gradient-text">
            Why Choose DrKnowsIt?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Our AI-powered platform combines advanced technology with healthcare and veterinary expertise to provide 
            you with personalized guidance and seamless communication with doctors and veterinarians.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover-scale animate-fade-in bg-card/95 backdrop-blur shadow-card hover:shadow-elevated transition-all duration-300" style={{
              animationDelay: `${index * 0.1}s`
            }}>
              <CardContent className="p-8">
                {/* Icon and Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bubble text-white group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {feature.highlight}
                  </Badge>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Benefits */}
                <div className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-accent mr-2 flex-shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center animate-fade-in">
          <Card className="inline-block p-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Ready to Transform Your Healthcare & Pet Care Experience?
              </h3>
              <p className="text-muted-foreground mb-4 max-w-2xl">
                Join our early users who are helping us build the future of AI-powered healthcare and veterinary communication.
              </p>
              <UserCountBadge variant="cta" className="justify-center mb-6" />
              <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-accent mr-2" />
                  Early access available
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-accent mr-2" />
                  AI-powered insights
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-accent mr-2" />
                  Secure & private
                </div>
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

// ============= Footer Component =============
export const Footer = ({ onSignUp }: { onSignUp?: () => void }) => {
  const isMobile = useIsMobile();
  
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bubble">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">DrKnowsIt</div>
                  <div className="text-xs text-muted-foreground">AI Medical Guidance</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empowering individuals with AI-powered medical guidance to make informed health decisions 
                and improve communication with healthcare providers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
               <ul className="space-y-3 text-sm">
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
              <h3 className="text-sm font-semibold text-foreground mb-4">Support</h3>
               <ul className="space-y-3 text-sm">
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
              <h3 className="text-sm font-semibold text-foreground mb-4">Contact</h3>
               <ul className="space-y-3 text-sm">
                 <li className="flex items-center space-x-2">
                   <Mail className="h-4 w-4 text-muted-foreground" />
                   <a href="mailto:support@drknowit.com" className="text-muted-foreground hover:text-primary transition-smooth">
                     support@drknowit.com
                   </a>
                 </li>
                 <li className="flex items-center space-x-2 text-muted-foreground">
                   <Shield className="h-4 w-4" />
                   <span>Enterprise Security</span>
                 </li>
               </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section - Mobile optimized */}
        <div className="border-t border-border py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-3 lg:space-y-0 gap-4">
            <div className="mobile-text-sm text-muted-foreground text-center lg:text-left">
              © 2025 DrKnowsIt. All rights reserved.
            </div>
            
            {/* Important Medical Disclaimer - Mobile responsive */}
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 max-w-full">
              <Heart className="h-4 w-4 text-warning flex-shrink-0" />
              <span className="mobile-text-xs font-medium text-warning text-center lg:text-left break-words">
                Not a substitute for professional medical advice
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};