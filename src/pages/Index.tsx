import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Construction, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { DashboardHeader } from "@/components/DashboardHeader";
import { HowItWorks, Features, Footer, UserCountBadge } from "@/components/LandingPageComponents";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { useAuth } from "@/hooks/useAuth";
import { useConversationsQuery } from "@/hooks/optimized/useConversationsQuery";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/utils/logger";
import { ChatInterfaceWithUsers } from "@/components/chat/ChatInterfaceWithPatients";
import { ChatGPTInterface } from "@/components/chat/ChatGPTInterface";



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
  // Prevent automatic scroll to hash sections on page load
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
      window.scrollTo(0, 0);
    }
  }, []);

  const openAuth = (mode: 'signin' | 'signup') => {
    navigate('/auth', {
      state: {
        mode
      }
    });
  };
  return <div className="min-h-screen bg-background">
      {/* Development Banner — slim, subtle */}
      <div className="border-b border-primary/15 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-primary/80">
          <Construction className="h-3.5 w-3.5" />
          <span>We're actively building DrKnowsIt — some features may be incomplete or change.</span>
          <a
            href="https://discord.gg/DPxjBESWZZ"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/70 transition-smooth"
          >
            <MessageCircle className="h-3 w-3" />
            Discord
          </a>
        </div>
      </div>
      {user ? <DashboardHeader /> : <Header onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />}
      <main>
      {isMobile ?
      // Mobile: natural-flow landing with hero, CTA, then embedded demo chat
      <section className="flex flex-col bg-background">
            {/* Mobile Hero */}
            <div className="bg-gradient-to-b from-card to-background">
              <div className="relative w-full aspect-[16/10] overflow-hidden">
                <img 
                  src="/lovable-uploads/4c436108-60c9-4699-a655-0db431da0371.png" 
                  alt="Blue holographic cartoon doctor with family and pet"
                  className="w-full h-full object-cover"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
              </div>

              <div className="px-4 pt-3 pb-4 text-center space-y-3">
                <h1 className="text-2xl font-extrabold text-foreground leading-tight tracking-tight">
                  Get prepared for
                  <span className="block text-primary">healthcare visits</span>
                </h1>
                <p className="text-sm text-muted-foreground leading-normal">
                  AI health assistant for humans &amp; pets. Available 24/7.
                </p>

                <div className="pt-1 flex flex-col items-center gap-2">
                  <button
                    onClick={() => openAuth('signup')}
                    className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
                  >
                    Get started free
                  </button>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20 text-xs font-medium text-primary">
                    <Users className="h-3 w-3" />
                    <UserCountBadge variant="cta" className="text-xs" />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-warning">
                  <span aria-hidden>⚠️</span>
                  <span className="font-medium">Information only · Consult professionals</span>
                </div>
              </div>
            </div>

            {/* Embedded demo chat */}
            <div className="bg-background border-t border-border" style={{ height: '70vh' }}>
              <ErrorBoundary scope="landing-chat">
                {showHistory && user ? <div className="h-full flex">
                    <ConversationSidebar conversations={conversations} currentConversation={currentConversation} onSelectConversation={selectConversation} onStartNewConversation={startNewConversation} onDeleteConversation={deleteConversation} isAuthenticated={!!user} />
                    <div className="flex-1 min-h-0">
                      <ChatGPTInterface />
                    </div>
                  </div> : <div className="h-full">
                    <ChatGPTInterface />
                  </div>}
              </ErrorBoundary>
            </div>
          </section> :
      // Desktop: Full layout with sidebar
      <section className="relative bg-background">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
              {/* Hero Section with Image */}
              <div className="grid lg:grid-cols-2 gap-12 items-center mb-14">
                {/* Left side - Text content */}
                <div className="text-center lg:text-left">
                  {/* Main Headline */}
                  <div className="mb-6">
                    <h1 className="text-4xl lg:text-[3.25rem] font-extrabold text-foreground mb-5 leading-[1.1] tracking-tight">
                      Get prepared for your
                      <span className="block text-primary mt-1">healthcare visits</span>
                    </h1>
                    <p className="text-lg text-muted-foreground mb-5 leading-normal max-w-xl">
                      AI-powered health assistant for humans and pets. Get symptom analysis, personalized insights, and appointment preparation — available 24/7.
                    </p>
                    <UserCountBadge variant="hero" className="mb-4" />
                  </div>
                  
                  {/* Powered by note */}
                  <div>
                    <p className="text-xs text-muted-foreground/60 tracking-wide uppercase">
                      Powered by GPT-5, Grok & more · Available 24/7
                    </p>
                  </div>
                </div>
                
                {/* Right side - AI Doctor Hologram Image */}
                <div className="flex justify-center lg:justify-end">
                  <div className="relative w-full max-w-md">
                <img 
                  src="/lovable-uploads/4c436108-60c9-4699-a655-0db431da0371.png" 
                  alt="Blue holographic cartoon doctor handing clipboard to real doctor with stethoscope, alongside smiling family with their dog on teal background"
                  className="w-full h-auto rounded-xl shadow-lg border border-border/50"
                  fetchPriority="high"
                />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-xl"></div>
                  </div>
                </div>
              </div>

              {/* Desktop Chat Interface with Sidebar */}
              <div className="mb-3 text-center">
                <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                  Try it now — ask anything about your health
                </p>
              </div>
              
              <div className="flex bg-card rounded-xl border border-border shadow-card overflow-hidden" style={{
            height: '65vh'
          }}>
                <ErrorBoundary scope="landing-chat-desktop">
                  <ConversationSidebar conversations={conversations} currentConversation={currentConversation} onSelectConversation={selectConversation} onStartNewConversation={startNewConversation} onDeleteConversation={deleteConversation} isAuthenticated={!!user} />
                  <ChatGPTInterface />
                </ErrorBoundary>
              </div>
              
              {/* Legal Disclaimer */}
              <div className="mt-5 max-w-3xl mx-auto">
                <div className="rounded-lg bg-warning/5 border border-warning/15 px-4 py-3 text-center">
                  <p className="text-xs text-warning/80">
                    ⚠️ For general information only. Always consult healthcare professionals and veterinarians for medical decisions.
                  </p>
                </div>
              </div>
            </div>
          </section>}

        {/* Info Sections - Now shown on mobile too */}
        <div className={isMobile ? "relative z-10 mt-2 px-4 pb-24 bg-background" : "mt-16"}>
          <HowItWorks />
          <Features />
        </div>
      </main>
      <Footer onSignUp={() => openAuth('signup')} />
    </div>;
};
export default Index;
