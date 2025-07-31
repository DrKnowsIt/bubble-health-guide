import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const FAQ = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

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
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about DrKnowsIt and how our AI health guidance works.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Is DrKnowsIt a replacement for my doctor?
                </h3>
                <p className="text-muted-foreground">
                  No. DrKnowsIt is designed to complement your healthcare, not replace it.
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
                  Your data security is important to us. All plans use encryption to protect your information, 
                  which is stored securely and never shared without your consent.
                </p>
              </CardContent>
            </Card>
            
            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  What's the difference between Basic and Pro plans?
                </h3>
                <p className="text-muted-foreground">
                  The Basic plan answers essential health questions with basic data tracking and conversation history. 
                  The Pro plan includes full health tracking, comprehensive conversation history, health forms, and more advanced AI analysis.
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

            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  How does the AI understand my health concerns?
                </h3>
                <p className="text-muted-foreground">
                  Our AI uses advanced natural language processing to understand your health questions and concerns. 
                  It analyzes the information you provide and offers relevant educational content based on medical knowledge databases.
                </p>
              </CardContent>
            </Card>

            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Can I use DrKnowsIt for emergency situations?
                </h3>
                <p className="text-muted-foreground">
                  No, DrKnowsIt should never be used for medical emergencies. In case of a medical emergency, 
                  call your local emergency number (911 in the US) or go to the nearest emergency room immediately.
                </p>
              </CardContent>
            </Card>

            <Card className="medical-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  How do I get started with DrKnowsIt?
                </h3>
                <p className="text-muted-foreground">
                  Simply sign up for an account, choose your preferred plan, and start asking health-related questions. 
                  Our AI will provide personalized responses based on your queries and help guide your health journey.
                </p>
              </CardContent>
            </Card>
          </div>
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

export default FAQ;