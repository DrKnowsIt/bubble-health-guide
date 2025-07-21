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

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    navigate('/auth', { state: { mode } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />
      <main>
        {/* Chat-First Layout with Sidebar */}
        <section className="relative bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
            {/* Compact Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Chat with{" "}
                <span className="text-primary">DrKnowsIt</span>
              </h1>
              <p className="text-sm text-muted-foreground mb-3">
                Get instant medical guidance through AI-powered conversation
              </p>
              
              {/* Legal Disclaimer */}
              <div className="mx-auto max-w-xl rounded-lg bg-warning/10 border border-warning/20 p-2 mb-4">
                <p className="text-xs font-medium text-warning">
                  ⚠️ For general health information only. Always consult healthcare professionals for medical decisions.
                </p>
              </div>
            </div>

            {/* Chat Interface with Sidebar - Primary Focus */}
            <div className="flex bg-card rounded-lg border border-border shadow-sm overflow-hidden" style={{ height: '70vh' }}>
              <ConversationSidebar
                conversations={conversations}
                currentConversation={currentConversation}
                onSelectConversation={selectConversation}
                onStartNewConversation={startNewConversation}
                onDeleteConversation={deleteConversation}
                isAuthenticated={!!user}
              />
              <ChatInterfaceWithHistory />
            </div>
          </div>
        </section>

        {/* Condensed Info Sections */}
        <div className="mt-12">
          <HowItWorks />
          <Features />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
