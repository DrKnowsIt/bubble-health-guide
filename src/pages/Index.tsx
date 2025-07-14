import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
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
        <Hero onGetStarted={() => openAuth('signup')} />
        <Features />
        <ChatInterface />
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
