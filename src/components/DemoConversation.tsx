import { Bot, User, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DemoMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const demoMessages: DemoMessage[] = [
  {
    id: 'welcome',
    type: 'ai',
    content: "Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?",
    timestamp: new Date()
  },
  {
    id: 'user1',
    type: 'user',
    content: "I've been having headaches for the past week, along with fatigue and difficulty concentrating. They get worse in the afternoon.",
    timestamp: new Date()
  },
  {
    id: 'ai1',
    type: 'ai',
    content: "I understand you're experiencing headaches with fatigue and concentration issues that worsen in the afternoon. To better understand what might be happening, I'd like to ask a few questions:\n\n• Have you noticed any sensitivity to light or sound?\n• How would you rate your stress levels lately?\n• Are you getting enough sleep and staying hydrated?\n• Do you spend long periods looking at screens?\n\nThese details will help me provide more relevant guidance, though I'd always recommend consulting with a healthcare provider for proper evaluation.",
    timestamp: new Date()
  },
  {
    id: 'user2',
    type: 'user',
    content: "Yes, I am sensitive to light. I've been stressed at work and probably not drinking enough water.",
    timestamp: new Date()
  },
  {
    id: 'ai2',
    type: 'ai',
    content: "Thank you for sharing those details. Light sensitivity combined with afternoon headaches could suggest several possibilities, but I'd need more information to provide better guidance:\n\n• When did these symptoms first start?\n• Have you had any vision changes?\n• Do the headaches have a specific pattern or location?\n• Any nausea or other symptoms?\n\nBased on what you've shared, stress and dehydration could certainly be contributing factors. I'd strongly recommend documenting your symptoms and discussing them with a healthcare provider for proper assessment.",
    timestamp: new Date()
  }
];

const probableDiagnoses = [
  {
    condition: "Tension-Type Headache",
    probability: "?",
    description: "Possible if stress-related, needs more evaluation",
    severity: "unknown" as const
  },
  {
    condition: "Migraine Episode",
    probability: "?",
    description: "Light sensitivity suggests this, but requires assessment",
    severity: "unknown" as const
  },
  {
    condition: "Dehydration Effects",
    probability: "?",
    description: "Could contribute to symptoms, easily addressable",
    severity: "unknown" as const
  },
  {
    condition: "Eye Strain",
    probability: "?",
    description: "Possible if significant screen time involved",
    severity: "unknown" as const
  }
];

export const DemoConversation = () => {
  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-background">
      {/* Main Content - Mobile-First Responsive Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full gap-2 lg:gap-4 p-3 lg:p-4 max-w-full overflow-hidden">
          {/* Chat Messages - Mobile optimized */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-[50vh] lg:min-h-0 max-w-full">
            <div className="space-y-2 lg:space-y-4 pr-1 lg:pr-2">
              {demoMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.type === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[85%] lg:max-w-[90%] gap-1.5 lg:gap-3",
                      message.type === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 lg:h-8 lg:w-8 items-center justify-center rounded-full flex-shrink-0 mt-1",
                        message.type === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary text-white"
                      )}
                    >
                      {message.type === 'user' ? (
                        <User className="h-3 w-3 lg:h-4 lg:w-4" />
                      ) : (
                        <Bot className="h-3 w-3 lg:h-4 lg:w-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "px-2.5 py-1.5 lg:px-4 lg:py-3 mobile-text-sm lg:text-sm rounded-2xl break-words whitespace-pre-line word-break max-w-full overflow-wrap-anywhere leading-relaxed",
                        message.type === 'user' 
                          ? "bg-primary text-primary-foreground rounded-br-md" 
                          : "bg-card border border-border rounded-bl-md"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Initial Assessment - Mobile optimized sizing */}
          <div className="w-full lg:w-80 lg:shrink-0 mt-2 lg:mt-0 max-w-full">
            <Card className="bg-background border-border">
              <CardHeader className="pb-2 lg:pb-3 p-3 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-primary mobile-text-base lg:text-lg">
                  <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                  Initial Assessment
                </CardTitle>
                <p className="mobile-text-xs lg:text-sm text-muted-foreground">
                  Based on limited information, these conditions require further evaluation:
                </p>
              </CardHeader>
              <CardContent className="space-y-2 lg:space-y-3 p-3 lg:p-6 pt-0">
                {probableDiagnoses.map((diagnosis, index) => (
                  <div key={index} className="flex items-start justify-between p-2 lg:p-3 bg-muted/30 rounded-lg border border-border gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start lg:items-center gap-1 lg:gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-foreground mobile-text-xs lg:text-base break-words leading-tight">
                          {diagnosis.condition}
                        </h4>
                        <Badge variant="outline" className="mobile-text-xs flex-shrink-0">
                          needs evaluation
                        </Badge>
                      </div>
                      <p className="mobile-text-xs text-muted-foreground break-words leading-relaxed">
                        {diagnosis.description}
                      </p>
                    </div>
                    <div className="text-right ml-1 lg:ml-3 flex-shrink-0">
                      <div className="mobile-text-base lg:text-lg font-bold text-primary">
                        {diagnosis.probability}
                      </div>
                      <div className="mobile-text-xs text-muted-foreground">
                        uncertain
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Demo Notice - Mobile optimized */}
      <div className="shrink-0 bg-card border-t border-border p-3 lg:p-4 max-w-full">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center px-2 py-1 lg:px-3 lg:py-2 rounded-lg bg-primary/10 border border-primary/20">
            <span className="mobile-text-xs lg:text-sm font-medium text-primary">
              This is a demo conversation
            </span>
          </div>
          <p className="mobile-text-xs text-muted-foreground max-w-full break-words px-2 leading-relaxed">
            Sign up to start your own conversations with DrKnowsIt and get personalized health insights
          </p>
        </div>
      </div>
    </div>
  );
};