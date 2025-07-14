import { MessageCircle, Mic, FileText, Users, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Intelligent Chat Interface",
    description: "Engage in natural conversations with DrBubble. Our AI understands medical terminology and provides clear, helpful responses to your health questions."
  },
  {
    icon: Mic,
    title: "Voice Mode",
    description: "Speak naturally with DrBubble using our advanced voice recognition. Perfect for when you're on the go or prefer verbal communication."
  },
  {
    icon: FileText,
    title: "Auto Health Records",
    description: "DrBubble automatically organizes your conversations into a comprehensive health profile, making it easy to track symptoms and concerns over time."
  },
  {
    icon: Users,
    title: "Doctor Communication",
    description: "Generate professional summaries of your AI interactions to share with your healthcare provider, facilitating better doctor-patient communication."
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Your health information is protected with enterprise-grade security. We're HIPAA compliant and never share your data without permission."
  },
  {
    icon: Zap,
    title: "Instant Responses",
    description: "Get immediate guidance 24/7. DrBubble is always available to help you understand health topics and prepare for medical appointments."
  }
];

export const Features = () => {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl mb-4">
            Why Choose DrBubble?
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our AI-powered platform combines cutting-edge technology with medical expertise 
            to provide you with reliable, accessible healthcare guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="medical-card p-6 group hover:scale-105 transition-all duration-300"
            >
              <div className="mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl gradient-bubble text-white group-hover:shadow-elevated transition-shadow">
                  <feature.icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Additional Trust Section */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-6 rounded-2xl bg-white/80 shadow-card px-8 py-4 backdrop-blur">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="h-12 w-px bg-border"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">HIPAA</div>
              <div className="text-sm text-muted-foreground">Compliant</div>
            </div>
            <div className="h-12 w-px bg-border"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">Free</div>
              <div className="text-sm text-muted-foreground">Trial Credits</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};