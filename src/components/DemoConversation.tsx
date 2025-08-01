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
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Main Content - Side by Side Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full gap-4 p-4">
          {/* Chat Messages - Left Side */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-4">
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
                      "flex max-w-[85%] space-x-3",
                      message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 mt-1",
                        message.type === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary text-white"
                      )}
                    >
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "px-4 py-3 text-sm rounded-2xl break-words whitespace-pre-line",
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

          {/* Probable Diagnoses - Right Side */}
          <div className="w-80 shrink-0">
            <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 dark:from-teal-950/20 dark:to-cyan-950/20 dark:border-teal-800 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-teal-900 dark:text-teal-100">
                  <TrendingUp className="h-5 w-5" />
                  Initial Assessment
                </CardTitle>
                <p className="text-sm text-teal-700 dark:text-teal-300">
                  Based on limited information, these conditions require further evaluation:
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {probableDiagnoses.map((diagnosis, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-teal-100 dark:border-teal-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {diagnosis.condition}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          needs evaluation
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {diagnosis.description}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                        {diagnosis.probability}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
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

      {/* Demo Notice */}
      <div className="shrink-0 bg-card border-t border-border p-4">
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 mb-2">
            <span className="text-sm font-medium text-primary">
              This is a demo conversation
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Sign up to start your own conversations with DrKnowsIt and get personalized health insights
          </p>
        </div>
      </div>
    </div>
  );
};