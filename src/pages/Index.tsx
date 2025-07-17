import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { ChatInterface } from "@/components/ChatInterface";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";

const Index = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />
      <main>
        {/* Chat-First Layout */}
        <section className="relative py-12 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Brief Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Chat with{" "}
                <span className="text-primary">DrKnowItAll</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Get instant medical guidance through AI-powered conversation
              </p>
              
              {/* Legal Disclaimer */}
              <div className="mx-auto max-w-2xl rounded-lg bg-warning/10 border border-warning/20 p-3 mb-6">
                <p className="text-sm font-medium text-warning">
                  ⚠️ For general health information only. Always consult healthcare professionals for medical decisions.
                </p>
              </div>
            </div>

            {/* Chat Interface - Primary Focus */}
            <ChatInterface />
          </div>
        </section>

        {/* Condensed Info Sections */}
        <HowItWorks />
        <Features />
      </main>
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

export default Index;
