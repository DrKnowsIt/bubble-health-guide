import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { DashboardHeader } from "@/components/DashboardHeader";
import { HowItWorks, Features, Footer, UserCountBadge } from "@/components/LandingPageComponents";
// import { ChatInterfaceWithHistory } from "@/components/ChatInterfaceWithHistory"; // Consolidated into ChatGPTInterface
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";

import { useAuth } from "@/hooks/useAuth";
import { useConversationsQuery } from "@/hooks/optimized/useConversationsQuery";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/utils/logger";
import { ChatInterfaceWithUsers } from "@/components/chat/ChatInterfaceWithPatients";
import { ChatGPTInterface } from "@/components/chat/ChatGPTInterface";

import heroCgiImage from "@/assets/hero-friendly-healthcare.jpg";

const Index = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showHistory, setShowHistory] = useState(false);
  const {
    conversations,
    currentConversation,
    selectConversation,
    startNewConversation,
    deleteConversation
  } = useConversationsQuery(null);
  const openAuth = (mode: 'signin' | 'signup') => {
    navigate('/auth', {
      state: {
        mode
      }
    });
  };
  return <div className="min-h-screen bg-background">
      {user ? <DashboardHeader /> : <Header onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />}
      <main>
        {isMobile ?
      // Mobile: Clean, simple chat interface with better spacing
      <section className="h-[calc(100vh-4rem)]">
            <div className="h-full flex flex-col">
              {/* Mobile Header - Properly spaced */}
              <div className="shrink-0 text-center p-4 bg-card border-b border-border space-y-3">
                <h1 className="mobile-text-lg sm:text-xl font-bold text-foreground leading-tight">
                  Healthcare & pet care feeling rushed?
                </h1>
                <p className="mobile-text-sm text-muted-foreground leading-relaxed">
                  Come prepared with{" "}
                  <span className="text-primary font-semibold">DrKnowsIt</span> - for you and your pets
                </p>
                <p className="mobile-text-xs text-muted-foreground/70">
                  Powered by Grok • Medical images via ISIC Archive
                </p>
                
                {/* Compact Disclaimer - Better mobile formatting */}
                <div className="rounded-md bg-warning/10 border border-warning/20 p-3 mx-2">
                  <p className="mobile-text-xs text-warning font-medium leading-relaxed">
                    ⚠️ General information only. Consult healthcare professionals for medical decisions.
                  </p>
                </div>
              </div>

              {/* Mobile Chat - Properly contained with spacing */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {showHistory && user ? <div className="h-full flex">
                    <ConversationSidebar conversations={conversations} currentConversation={currentConversation} onSelectConversation={selectConversation} onStartNewConversation={startNewConversation} onDeleteConversation={deleteConversation} isAuthenticated={!!user} />
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <ChatGPTInterface />
                    </div>
                  </div> : <div className="h-full overflow-hidden">
                    <ChatGPTInterface />
                  </div>}
              </div>
            </div>
          </section> :
      // Desktop: Full layout with sidebar
      <section className="relative bg-background">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
              {/* Hero Section with Image */}
              <div className="grid lg:grid-cols-2 gap-16 items-center mb-12">
                {/* Left side - Text content */}
                <div className="text-center lg:text-left">
                  {/* Main Headline */}
                  <div className="mb-8">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                      Get prepared for your
                      <span className="block text-primary">healthcare visits</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                      <span className="text-teal-400 font-semibold">AI-powered</span> guidance to help you organize thoughts, ask the right questions, and feel confident at appointments.
                    </p>
                    <UserCountBadge variant="hero" className="mb-6" />
                  </div>
                  
                  {/* Powered by note */}
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground/80">
                      Powered by GPT-5, Grok & more • Available 24/7
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      Dermatological image examples powered by ISIC Archive
                    </p>
                  </div>
                </div>
                
                {/* Right side - AI Doctor Hologram Image */}
                <div className="flex justify-center lg:justify-end">
                  <div className="relative max-w-md w-full">
                    <img 
                      src="/lovable-uploads/4c436108-60c9-4699-a655-0db431da0371.png" 
                      alt="Blue holographic cartoon doctor handing clipboard to real doctor with stethoscope, alongside smiling family with their dog on teal background"
                      className="w-full h-auto rounded-2xl shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl"></div>
                  </div>
                </div>
              </div>

              {/* Desktop Chat Interface with Sidebar */}
              <div className="flex bg-card rounded-xl border border-border shadow-lg overflow-hidden" style={{
            height: '65vh'
          }}>
                <ConversationSidebar conversations={conversations} currentConversation={currentConversation} onSelectConversation={selectConversation} onStartNewConversation={startNewConversation} onDeleteConversation={deleteConversation} isAuthenticated={!!user} />
                <ChatGPTInterface />
              </div>
              
              {/* Legal Disclaimer */}
              <div className="mt-6 max-w-4xl mx-auto">
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-4 text-center">
                  <p className="text-sm text-warning font-medium">
                    ⚠️ For general information only. Always consult healthcare professionals and veterinarians for medical decisions.
                  </p>
                </div>
              </div>
            </div>
          </section>}

        {/* Info Sections - Hidden on mobile to keep it simple */}
        {!isMobile && <div className="mt-12">
            <HowItWorks />
            <Features />
          </div>}
      </main>
      <Footer onSignUp={() => openAuth('signup')} />
    </div>;
};
export default Index;