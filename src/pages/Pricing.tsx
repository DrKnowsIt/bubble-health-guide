import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Zap, Crown, Shield, MessageCircle, FileText, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { Link } from "react-router-dom";

const Pricing = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Basic AI health chat with limited medical guidance",
      features: [
        "10,000 tokens/month (~30 conversations)",
        "General health questions & wellness tips",
        "Basic symptom discussions",
        "Health education content",
        "Standard response time",
        "Community support",
        "HIPAA compliant"
      ],
      buttonText: "Start Free",
      buttonVariant: "outline" as const,
      icon: MessageCircle,
      popular: false
    },
    {
      name: "Basic",
      price: "$25",
      period: "per month",
      description: "Essential AI health guidance with moderate token usage",
      features: [
        "50,000 tokens/month (~150 conversations)",
        "Basic health queries & symptom checking",
        "Standard processing speed",
        "Health profile management",
        "Text-based interactions",
        "Email support",
        "HIPAA compliant"
      ],
      buttonText: "Choose Basic",
      buttonVariant: "outline" as const,
      icon: MessageCircle,
      popular: false
    },
    {
      name: "Professional",
      price: "$50",
      period: "per month",
      description: "Advanced AI analysis with enhanced token allocation",
      features: [
        "150,000 tokens/month (~450 conversations)",
        "Complex medical reasoning & analysis",
        "Lab result interpretation",
        "Drug interaction checking",
        "Family health tracking (up to 4 members)",
        "Priority processing speed",
        "Doctor-ready exports",
        "Priority support"
      ],
      buttonText: "Choose Professional",
      buttonVariant: "default" as const,
      icon: Zap,
      popular: true
    },
    {
      name: "Premium",
      price: "$75",
      period: "per month",
      description: "Maximum AI capability with unlimited complex processing",
      features: [
        "300,000 tokens/month (~900 conversations)",
        "Advanced chain-of-thought reasoning",
        "Multi-modal analysis (text, images, files)",
        "Comprehensive medical insights",
        "Research paper analysis",
        "Personalized treatment planning",
        "24/7 priority support",
        "Early access to new features",
        "Custom AI model fine-tuning"
      ],
      buttonText: "Choose Premium",
      buttonVariant: "default" as const,
      icon: Crown,
      popular: false
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Enterprise-grade encryption and security protocols protect your sensitive health information at all times"
    },
    {
      icon: FileText,
      title: "Professional Reports",
      description: "Generate detailed health summaries and conversation exports formatted for healthcare providers"
    },
    {
      icon: MessageCircle,
      title: "24/7 AI Access",
      description: "Get instant health guidance whenever you need it, with our advanced chain-of-thought processing"
    },
    {
      icon: Star,
      title: "Accuracy Validated",
      description: "Multi-layer validation system with confidence scoring to minimize hallucinations and ensure reliability"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized AI infrastructure delivers responses in seconds, not minutes"
    },
    {
      icon: Crown,
      title: "Premium Support",
      description: "Priority customer support with health-focused assistance from our specialized team"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />
      
      {/* Back to Home Link */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </div>
      {/* Header */}
      <div className="py-20 text-center gradient-hero">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl mb-6">
            Choose Your Health Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with our free trial, then upgrade to unlock the full power of DrKnowItAll 
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
              Why Choose DrKnowItAll?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every plan includes our core features designed to empower your health journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  Is DrKnowItAll a replacement for my doctor?
                </h3>
                <p className="text-muted-foreground">
                  No. DrKnowItAll is designed to complement your healthcare, not replace it.
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
                  Your information is never shared without your explicit consent and all data is stored 
                  in secure, encrypted databases with multi-factor authentication.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  What happens when I reach my conversation limit?
                </h3>
                <p className="text-muted-foreground">
                  On the Starter plan, you'll receive a notification when approaching your 25 monthly conversations. 
                  You can upgrade anytime or wait until the next month. Essential and Professional plans offer 
                  200 conversations and unlimited conversations respectively.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  How accurate is the AI medical guidance?
                </h3>
                <p className="text-muted-foreground">
                  Our proprietary chain-of-thought architecture includes multiple validation layers and 
                  confidence scoring to minimize hallucinations. Each response includes uncertainty indicators, 
                  but remember that AI guidance should complement, not replace, professional medical advice.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Can I cancel my subscription anytime?
                </h3>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time with no cancellation fees. 
                  You'll continue to have access until the end of your current billing period, 
                  and you can always reactivate later.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Do you offer family plans or discounts?
                </h3>
                <p className="text-muted-foreground">
                  The Professional plan includes family health tracking for up to 4 members. 
                  We also offer annual billing discounts (2 months free) and student discounts. 
                  Contact our support team for enterprise or bulk pricing options.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-muted-foreground">
                  We accept all major credit cards (Visa, MasterCard, American Express), 
                  PayPal, and Apple Pay. All payments are processed securely through Stripe 
                  with bank-level encryption.
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
          <Button size="lg" className="btn-primary text-lg px-8 py-4" onClick={() => openAuth('signup')}>
            Start Free Trial
          </Button>
        </div>
      </div>
      
      <Footer />
      
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        mode={authMode}
        onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
      />
    </div>
  );
};

export default Pricing;