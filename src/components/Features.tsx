import { MessageCircle, Mic, FileText, Users, Shield, Zap, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: MessageCircle,
    title: "AI-Powered Health Analysis",
    description: "Advanced AI analyzes your symptoms and health concerns using the latest medical knowledge, providing personalized insights for both human and pet health to help you communicate more effectively with healthcare providers.",
    highlight: "Basic+",
    benefits: ["Smart symptom analysis", "Evidence-based insights", "Personalized recommendations"]
  },
  {
    icon: Mic,
    title: "Multi-Modal Intelligence",
    description: "Communicate through text, voice, or images. Upload photos of symptoms, speak your concerns, or type detailed descriptions - DrKnowsIt understands it all and provides comprehensive analysis.",
    highlight: "Pro Only",
    benefits: ["Voice recognition", "Image analysis", "Multi-format input"]
  },
  {
    icon: FileText,
    title: "Smart Health Profiles",
    description: "Automatically builds detailed health histories for your entire family and pets, tracking patterns, medications, and symptoms over time to provide better context for healthcare visits.",
    highlight: "Pro Only",
    benefits: ["Pattern recognition", "Medication tracking", "Family & pet profiles"]
  },
  {
    icon: Users,
    title: "Appointment Optimizer",
    description: "Generates professional, organized summaries and targeted questions for your healthcare visits. Ensures you maximize your limited appointment time and don't forget crucial details.",
    highlight: "Basic+",
    benefits: ["Professional summaries", "Targeted questions", "Visit preparation"]
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption protects your health data. Your conversations remain private with zero data sharing. All processing happens securely within our protected infrastructure.",
    highlight: "Basic+",
    benefits: ["Bank-level encryption", "Private conversations", "Secure infrastructure"]
  },
  {
    icon: Zap,
    title: "Contextual Memory",
    description: "DrKnowsIt remembers your health journey, connecting past conversations to provide more relevant insights. No need to repeat your medical history - it builds on previous discussions.",
    highlight: "Pro Only",
    benefits: ["Conversation memory", "Connected insights", "Evolving understanding"]
  }
];


export const Features = () => {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium">
            🚀 Coming Soon
          </Badge>
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
            <Card
              key={index}
              className="group hover-scale animate-fade-in bg-card/95 backdrop-blur shadow-card hover:shadow-elevated transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
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
              <p className="text-muted-foreground mb-6 max-w-2xl">
                Join our early users who are helping us build the future of AI-powered healthcare and veterinary communication.
              </p>
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