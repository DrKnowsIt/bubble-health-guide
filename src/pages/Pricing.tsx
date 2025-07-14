import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Zap, Crown, Shield, MessageCircle, FileText } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free Trial",
      price: "$0",
      period: "50 credits",
      description: "Perfect for exploring DrBubbles",
      features: [
        "50 AI conversations",
        "Basic health profile",
        "Chat export",
        "Email support",
        "HIPAA compliant"
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "outline" as const,
      icon: MessageCircle,
      popular: false
    },
    {
      name: "Basic Plan",
      price: "$19",
      period: "per month",
      description: "For regular health guidance",
      features: [
        "Unlimited AI conversations",
        "Complete health profile",
        "Voice mode access",
        "Weekly health summaries",
        "Doctor-ready exports",
        "Priority support",
        "Mobile app access"
      ],
      buttonText: "Choose Basic",
      buttonVariant: "default" as const,
      icon: Zap,
      popular: true
    },
    {
      name: "Advanced Plan",
      price: "$39",
      period: "per month",
      description: "Complete health management",
      features: [
        "Everything in Basic",
        "Direct doctor communication",
        "Advanced AI insights",
        "Family health tracking",
        "Medication reminders",
        "Lab result analysis",
        "24/7 priority support",
        "Telehealth integrations"
      ],
      buttonText: "Choose Advanced",
      buttonVariant: "default" as const,
      icon: Crown,
      popular: false
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Your health data is protected with enterprise-grade security"
    },
    {
      icon: FileText,
      title: "Doctor Integration",
      description: "Export professional summaries to share with your healthcare team"
    },
    {
      icon: MessageCircle,
      title: "24/7 Access",
      description: "Get health guidance whenever you need it, day or night"
    },
    {
      icon: Star,
      title: "AI-Powered",
      description: "Advanced medical AI trained on the latest health information"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="py-20 text-center gradient-hero">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl mb-6">
            Choose Your Health Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with our free trial, then upgrade to unlock the full power of DrBubbles 
            for comprehensive health guidance and doctor communication.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card 
              key={plan.name} 
              className={`
                medical-card relative overflow-hidden transition-transform hover:scale-105
                ${plan.popular ? 'ring-2 ring-primary shadow-elevated' : ''}
              `}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
                  Most Popular
                </div>
              )}
              
              <CardHeader className={`text-center ${plan.popular ? 'pt-12' : ''}`}>
                <div className="flex justify-center mb-4">
                  <div className={`
                    flex h-12 w-12 items-center justify-center rounded-xl text-white
                    ${plan.popular ? 'gradient-bubble' : 'bg-muted-dark'}
                  `}>
                    <plan.icon className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-foreground mt-2">
                  {plan.price}
                  <span className="text-lg font-normal text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant={plan.buttonVariant}
                  className={`w-full ${plan.buttonVariant === 'default' ? 'btn-primary' : 'btn-outline'}`}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Choose DrBubbles?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every plan includes our core features designed to empower your health journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="medical-card text-center">
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bubble text-white">
                      <feature.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-6">
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Is DrBubbles a replacement for my doctor?
                </h3>
                <p className="text-muted-foreground">
                  No. DrBubbles is designed to complement your healthcare, not replace it. 
                  We help you understand health topics and prepare for doctor visits, but you 
                  should always consult healthcare professionals for medical decisions.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  How secure is my health information?
                </h3>
                <p className="text-muted-foreground">
                  We are HIPAA compliant and use enterprise-grade encryption to protect your data. 
                  Your information is never shared without your explicit consent.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Can I cancel my subscription anytime?
                </h3>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll continue to have 
                  access until the end of your current billing period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 gradient-hero">
        <div className="text-center max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start your free trial today and experience the future of personalized health guidance.
          </p>
          <Button size="lg" className="btn-primary text-lg px-8 py-4">
            Start Free Trial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;