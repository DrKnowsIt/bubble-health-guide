import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { ChatInterfaceWithHistory } from "@/components/ChatInterfaceWithHistory";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatInterfaceWithUsers } from "@/components/ChatInterfaceWithPatients";
import { SimpleChatInterface } from "@/components/SimpleChatInterface";
// Using the uploaded Dr. Knowsit mascot image
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
    startNewConversation,
    selectConversation,
    deleteConversation
  } = useConversations();
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  const openAuth = (mode: 'signin' | 'signup') => {
    navigate('/auth', {
      state: {
        mode
      }
    });
  };
  return <div className="min-h-screen bg-background">
      <Header onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />
      <main>
        {isMobile ?
      // Mobile: Clean, simple chat interface with better spacing
      <section className="h-[calc(100vh-4rem)]">
            <div className="h-full flex flex-col">
              {/* Mobile Header - Properly spaced */}
              <div className="shrink-0 text-center p-4 bg-card border-b border-border space-y-3">
                <h1 className="mobile-text-lg sm:text-xl font-bold text-foreground leading-tight">
                  Healthcare feeling like an assembly line?
                </h1>
                <p className="mobile-text-sm text-muted-foreground leading-relaxed">
                  Beat the system - come over-prepared with{" "}
                  <span className="text-primary font-semibold">DrKnowsIt</span>
                </p>
                <p className="mobile-text-xs text-muted-foreground/70">
                  Powered by Grok
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
                      <ChatInterfaceWithHistory />
                    </div>
                  </div> : <div className="h-full overflow-hidden">
                    <SimpleChatInterface onShowHistory={user ? () => setShowHistory(true) : undefined} />
                  </div>}
              </div>
            </div>
          </section> :
      // Desktop: Full layout with sidebar
      <section className="relative bg-background">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
              {/* Hero Section with Image */}
              <div className="grid lg:grid-cols-2 gap-12 items-center mb-8">
                {/* Left side - Text content */}
                <div className="text-center lg:text-left">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground mb-3">Healthcare feeling like a rushed assembly line more than actual care?</h1>
                    <p className="text-lg text-muted-foreground mb-4">Get organized before your appointment so you can communicate clearly and feel confident about your health concerns.</p>
                  </div>
                  
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Chat with{" "}
                      <span className="text-primary">DrKnowsIt</span>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      AI-powered health guidance available 24/7
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Powered by Grok
                    </p>
                  </div>
                  
                  {/* Legal Disclaimer */}
                  <div className="max-w-xl mx-auto lg:mx-0 rounded-lg bg-warning/10 border border-warning/20 p-2 mb-4">
                    <p className="text-xs font-medium text-warning">
                      ⚠️ For general health information only. Always consult healthcare professionals for medical decisions.
                    </p>
                  </div>
                </div>
                
                {/* Right side - AI Doctor Hologram Image */}
                <div className="flex justify-center lg:justify-end">
                  <div className="relative max-w-md w-full">
                    <img 
                      src="/lovable-uploads/069921a5-1824-4d71-9236-bfaad178e67d.png" 
                      alt="Dr. Knowsit mascot - a friendly cartoon stethoscope character introducing himself"
                      className="w-full h-auto rounded-2xl shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl"></div>
                  </div>
                </div>
              </div>

              {/* Desktop Chat Interface with Sidebar */}
              <div className="flex bg-card rounded-lg border border-border shadow-sm overflow-hidden" style={{
            height: '70vh'
          }}>
                <ConversationSidebar conversations={conversations} currentConversation={currentConversation} onSelectConversation={selectConversation} onStartNewConversation={startNewConversation} onDeleteConversation={deleteConversation} isAuthenticated={!!user} />
                <ChatInterfaceWithHistory />
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