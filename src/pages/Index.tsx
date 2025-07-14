import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ChatInterface } from "@/components/ChatInterface";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground"
         style={{ backgroundColor: 'hsl(0 0% 100%)', color: 'hsl(210 15% 20%)' }}>
      
      {/* Test content to ensure page loads */}
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          DrBubbles - AI Medical Guidance
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'hsl(210 15% 55%)' }}>
          Loading components...
        </p>
      </div>

      <Header />
      <main>
        <Hero />
        <Features />
        <ChatInterface />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
