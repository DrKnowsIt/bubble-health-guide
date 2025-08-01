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
import { ChatInterfaceWithPatients } from "@/components/ChatInterfaceWithPatients";
import { SimpleChatInterface } from "@/components/SimpleChatInterface";
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
      // Mobile: Clean, simple chat interface
      <section className="h-[calc(100vh-64px)]">
            <div className="h-full flex flex-col">
              {/* Mobile Header */}
              <div className="shrink-0 text-center p-4 bg-card border-b border-border">
                <h1 className="text-lg font-bold text-foreground mb-2">
                  Healthcare feeling like an assembly line?
                </h1>
                <p className="text-sm text-muted-foreground mb-2">
                  Beat the system - come over-prepared with{" "}
                  <span className="text-primary font-semibold">DrKnowsIt</span>
                </p>
                <p className="text-xs text-muted-foreground/70 mb-3">
                  Powered by Grok
                </p>
                
                {/* Compact Disclaimer */}
                <div className="rounded-md bg-warning/10 border border-warning/20 p-2">
                  <p className="text-xs text-warning font-medium">
                    ⚠️ General information only. Consult healthcare professionals for medical decisions.
                  </p>
                </div>
              </div>

              {/* Mobile Chat - Simple interface */}
              <div className="flex-1">
                {showHistory && user ? <div className="h-full flex">
                    <ConversationSidebar conversations={conversations} currentConversation={currentConversation} onSelectConversation={selectConversation} onStartNewConversation={startNewConversation} onDeleteConversation={deleteConversation} isAuthenticated={!!user} />
                    <div className="flex-1">
                      <ChatInterfaceWithHistory />
                    </div>
                  </div> : <SimpleChatInterface onShowHistory={user ? () => setShowHistory(true) : undefined} />}
              </div>
            </div>
          </section> :
      // Desktop: Full layout with sidebar
      <section className="relative bg-background">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
              {/* Pain Point Hero */}
              <div className="text-center mb-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-foreground mb-3">Healthcare feeling like a rushed assembly line more than actual care?</h1>
                  <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">Get organized before your appointment so you can communicate clearly and feel confident about your health concerns.</p>
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
                <div className="mx-auto max-w-xl rounded-lg bg-warning/10 border border-warning/20 p-2 mb-4">
                  <p className="text-xs font-medium text-warning">
                    ⚠️ For general health information only. Always consult healthcare professionals for medical decisions.
                  </p>
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
      <Footer />
    </div>;
};
export default Index;