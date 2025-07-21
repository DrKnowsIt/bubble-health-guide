import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Zap, Crown, Shield, MessageCircle, FileText, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Pricing = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user } = useAuth();
  const { subscribed, subscription_tier, createCheckoutSession, openCustomerPortal } = useSubscription();

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handlePlanAction = async (planName: string) => {
    if (planName === "Free") {
      if (!user) {
        openAuth('signup');
      } else {
        // Redirect to dashboard for free tier
        window.location.href = '/dashboard';
      }
    } else if (planName === "Pro") {
      if (!user) {
        openAuth('signup');
        return;
      }
      
      if (subscribed && subscription_tier === 'pro') {
        // Already subscribed - open customer portal
        try {
          await openCustomerPortal();
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to open customer portal. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Start subscription
        try {
          await createCheckoutSession();
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to start checkout process. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Basic AI health questions with no data tracking",
      features: [
        "Answer basic health questions",
        "General wellness information",
        "Health education content",
        "No conversation history",
        "No health forms or tracking",
        "No personal data storage",
        "Standard response time"
      ],
      buttonText: "Start Free",
      buttonVariant: "outline" as const,
      icon: MessageCircle,
      popular: false
    },
    {
      name: "Pro",
      price: "$2",
      period: "per month",
      description: "Full AI health guidance with complete tracking and history",
      features: [
        "Unlimited health questions",
        "Complex medical reasoning & analysis",
        "Health profile management",
        "Conversation history tracking",
        "Health forms and records",
        "Symptom tracking over time",
        "Lab result interpretation",
        "Drug interaction checking",
        "Priority processing speed",
        "Email support"
      ],
      buttonText: "Choose Pro",
      buttonVariant: "default" as const,
      icon: Zap,
      popular: true
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and secure. Free plan doesn't store personal data, paid plan keeps your information private"
    },
    {
      icon: MessageCircle,
      title: "24/7 AI Access",
      description: "Get instant health guidance whenever you need it, with our advanced AI processing"
    },
    {
      icon: Star,
      title: "Reliable Responses",
      description: "AI responses are designed to be helpful and informative for general health education"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized AI infrastructure delivers responses in seconds, not minutes"
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
            Start with our free plan for basic health questions, or upgrade to the paid plan 
            for comprehensive health tracking and advanced AI guidance.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                  onClick={() => handlePlanAction(plan.name)}
                >
                  {user && plan.name === "Free" && (!subscribed || subscription_tier === 'free') 
                    ? "Current" 
                    : user && plan.name === "Pro" && subscribed && subscription_tier === 'pro' 
                    ? "Manage Subscription" 
                    : plan.buttonText}
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
                  Your data security is important to us. The free plan doesn't store any personal health data. 
                  The paid plan uses encryption to protect your information, which is stored securely and never 
                  shared without your consent.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  What's the difference between Free and Pro plans?
                </h3>
                <p className="text-muted-foreground">
                  The Free plan answers basic health questions but doesn't save any data or conversation history. 
                  The Pro plan includes health tracking, conversation history, health forms, and more advanced AI analysis.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  How accurate is the AI health guidance?
                </h3>
                <p className="text-muted-foreground">
                  Our AI is designed to provide helpful health education and information. However, it's important 
                  to remember that AI guidance should complement, not replace, professional medical advice. Always 
                  consult healthcare professionals for medical decisions.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Can I cancel my subscription anytime?
                </h3>
                <p className="text-muted-foreground">
                  Yes, you can cancel your paid subscription at any time with no cancellation fees. 
                  You'll continue to have access until the end of your current billing period, 
                  and you can always reactivate later.
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