import { Button } from "@/components/ui/button";
import { MessageCircle, Mic, Shield, Sparkles } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative py-20 sm:py-24 lg:py-32 gradient-hero">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23a1a1aa%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-primary shadow-card backdrop-blur">
              <Sparkles className="mr-2 h-4 w-4" />
              AI-Powered Medical Guidance
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Tired of visiting{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              so many doctors?
            </span>
            <br />
            Get better prepared with AI insights
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Use AI to help guess what might be happening with your symptoms before your doctor visit. 
            DrKnowsIt helps you organize your thoughts and questions - never replacing professional medical care.
          </p>

          {/* Legal Disclaimer */}
          <div className="mx-auto mt-6 max-w-3xl rounded-xl bg-warning/10 border border-warning/20 p-4">
            <p className="text-sm font-medium text-warning">
              ⚠️ For informational purposes only. This AI helps you prepare questions and organize symptoms for your doctor visit.
              Only qualified healthcare providers can provide medical diagnoses and treatment decisions.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="btn-primary text-lg px-8 py-4" onClick={onGetStarted}>
              <MessageCircle className="mr-2 h-5 w-5" />
              Start Chatting Free
            </Button>
            <Button size="lg" variant="outline" className="btn-outline text-lg px-8 py-4">
              <Mic className="mr-2 h-5 w-5" />
              Try Voice Mode
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Shield className="mr-2 h-4 w-4 text-accent" />
              Enterprise Security
            </div>
            <div className="flex items-center">
              <MessageCircle className="mr-2 h-4 w-4 text-accent" />
              Free Testing Credits
            </div>
            <div className="flex items-center">
              <Sparkles className="mr-2 h-4 w-4 text-accent" />
              AI-Powered Insights
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};