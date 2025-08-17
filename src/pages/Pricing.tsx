import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Zap, Crown, Shield, MessageCircle, FileText, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { SubscriptionManagement } from "@/components/SubscriptionManagement";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Pricing = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user } = useAuth();
  const { subscribed, subscription_tier, openCustomerPortal } = useSubscription();

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handlePlanAction = async (planName: string) => {
    if (!user) {
      openAuth('signup');
      return;
    }

    const planType = planName.toLowerCase() as 'basic' | 'pro';

    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
  const plans = [
    {
      name: "Basic",
      price: "$25",
      period: "per month",
      description: "Essential AI health guidance for a single user with 4 core health forms",
      features: [
        "Answer basic health questions",
        "Manage 1 user",
        "4 essential health forms",
        "General wellness information",
        "Health education content",
        "Basic conversation history",
        "Personal data storage",
        "Standard response time"
      ],
      buttonText: "Choose Basic",
      buttonVariant: "outline" as const,
      icon: MessageCircle,
      popular: false
    },
    {
      name: "Pro",
      price: "$50",
      period: "per month",
      description: "Complete AI health guidance with up to 10 users and all 11 comprehensive health forms",
      features: [
        "Unlimited health questions",
        "Manage up to 10 users",
        "All 11 comprehensive health forms",
        "Advanced medical reasoning & analysis",
        "Health profile management",
        "Complete conversation history",
        "Health records management and summarization",
        "Symptom pattern analysis over time",
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
      description: "Your data is encrypted and secure. All plans include secure data storage and keep your information private"
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

  // If user is logged in, show subscription management instead of marketing pricing
  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        
        {/* Back to Dashboard Link */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Subscription Management Header */}
        <div className="py-12 text-center">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl mb-4">
              Subscription Management
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage your subscription, billing, and access to premium features.
            </p>
          </div>
        </div>

        {/* Subscription Management Content */}
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <SubscriptionManagement />
        </div>
        
        <Footer />
      </div>
    );
  }

  // Marketing pricing page for non-authenticated users
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
      <div className="py-20 text-center gradient-hero" style={{ scrollMarginTop: '64px' }}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl mb-6">
            Choose Your Health Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with our Basic plan for essential health questions, or upgrade to Pro 
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
                  disabled={Boolean(user && subscribed && plan.name.toLowerCase() === subscription_tier)}
                  onClick={() => handlePlanAction(plan.name)}
                >
                  {!user
                    ? `Get Started`
                    : subscribed
                      ? (plan.name.toLowerCase() === subscription_tier ? 'Current Plan' : 'Change Plan')
                      : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>



      {/* CTA Section */}
      <div className="py-16 gradient-hero">
        <div className="text-center max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Choose your plan and start getting personalized health guidance today.
          </p>
          <Button 
            size="lg" 
            className="btn-primary text-lg px-8 py-4" 
            onClick={async () => {
              if (!user) {
                openAuth('signup');
                return;
              }
              try {
                if (subscribed) {
                  await openCustomerPortal();
                } else {
                  await openCustomerPortal();
                }
              } catch (error) {
                toast({ title: 'Error', description: 'Please try again.', variant: 'destructive' });
              }
            }}
          >
            {!user ? 'Get Started Now' : subscribed ? 'Manage Subscription' : 'Start Pro'}
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