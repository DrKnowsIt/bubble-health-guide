import { MessageCircle, Mic, FileText, Users, Shield, Zap, CheckCircle, Star, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: MessageCircle,
    title: "Intelligent Chat Interface",
    description: "Engage in natural conversations with DrKnowsIt. Our AI helps you organize symptoms and prepare thoughtful questions for your healthcare provider.",
    highlight: "Most Popular",
    benefits: ["Natural conversation flow", "Smart follow-up questions", "Context-aware responses"]
  },
  {
    icon: Mic,
    title: "Voice Mode",
    description: "Speak naturally with DrKnowsIt using our advanced voice recognition. Perfect for when you're on the go or prefer verbal communication.",
    highlight: "New",
    benefits: ["Advanced voice recognition", "Hands-free operation", "Natural speech processing"]
  },
  {
    icon: FileText,
    title: "Auto Health Records",
    description: "DrKnowsIt automatically organizes your conversations into a comprehensive health profile, making it easy to track symptoms and concerns over time.",
    highlight: "Pro",
    benefits: ["Automatic organization", "Timeline tracking", "Comprehensive reports"]
  },
  {
    icon: Users,
    title: "Doctor Communication",
    description: "Generate organized summaries of your symptoms and concerns to share with your healthcare provider, ensuring you don't forget important details during appointments.",
    highlight: "Essential",
    benefits: ["Professional summaries", "Key points highlighted", "Appointment preparation"]
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Your health information is protected with enterprise-grade security and encryption. We maintain strict data protection standards and never share your personal information without permission.",
    highlight: "Certified",
    benefits: ["End-to-end encryption", "HIPAA compliant", "Zero data sharing"]
  },
  {
    icon: Zap,
    title: "Instant Responses",
    description: "Get immediate help organizing your thoughts 24/7. DrKnowsIt is always available to help you prepare thoughtful questions for medical appointments.",
    highlight: "24/7",
    benefits: ["Lightning fast responses", "Always available", "Real-time processing"]
  }
];

const stats = [
  { icon: Heart, label: "Patient Satisfaction", value: "98%", color: "text-red-500" },
  { icon: CheckCircle, label: "Accuracy Rate", value: "95%", color: "text-green-500" },
  { icon: Star, label: "User Rating", value: "4.9/5", color: "text-yellow-500" },
  { icon: Shield, label: "Security Score", value: "A+", color: "text-blue-500" }
];

export const Features = () => {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium">
            ✨ Trusted by thousands of users
          </Badge>
          <h2 className="text-4xl font-bold text-foreground sm:text-5xl mb-6 gradient-text">
            Why Choose DrKnowsIt?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Our AI-powered platform combines advanced technology with healthcare expertise to provide 
            you with personalized guidance and seamless doctor communication.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center p-6 hover-scale animate-fade-in border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-0">
                <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover-scale animate-fade-in border-0 bg-white/80 backdrop-blur shadow-card hover:shadow-elevated transition-all duration-300"
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
                Ready to Transform Your Healthcare Experience?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl">
                Join thousands of users who are already using DrKnowsIt to better understand their health 
                and communicate more effectively with their healthcare providers.
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-accent mr-2" />
                  Free to start
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-accent mr-2" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-accent mr-2" />
                  Instant access
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};