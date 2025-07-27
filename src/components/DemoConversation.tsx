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
    content: "I've been having persistent headaches for the past week, along with some fatigue and difficulty concentrating. They seem to get worse in the afternoon and I've also noticed some sensitivity to light.",
    timestamp: new Date()
  },
  {
    id: 'ai1',
    type: 'ai',
    content: "Thank you for sharing those symptoms. Based on what you've described - persistent headaches with fatigue, concentration difficulties, and light sensitivity - there are several possible explanations to consider. Let me break this down for you:\n\n**Possible causes include:**\n- Tension headaches (often stress-related)\n- Migraine episodes\n- Dehydration or sleep issues\n- Eye strain from screen time\n- Sinus congestion\n\n**Red flags to watch for:**\n- Sudden, severe headache unlike any before\n- Fever with headache\n- Vision changes\n- Neck stiffness\n\n**Questions to help narrow it down:**\n- Have you been under more stress lately?\n- How's your sleep and hydration?\n- Any recent changes in medication or lifestyle?\n- Do you spend long hours looking at screens?\n\nI'd recommend keeping a headache diary and seeing your healthcare provider, especially if symptoms persist or worsen.",
    timestamp: new Date()
  },
  {
    id: 'user2',
    type: 'user',
    content: "That's really helpful! I have been stressed at work lately and probably not drinking enough water. What should I discuss with my doctor when I see them?",
    timestamp: new Date()
  },
  {
    id: 'ai2',
    type: 'ai',
    content: "Great question! Here's what to prepare for your doctor visit:\n\n**Key information to share:**\n- Timeline: When headaches started, frequency, duration\n- Pattern: Time of day they're worst, triggers you've noticed\n- Associated symptoms: fatigue, light sensitivity, concentration issues\n- Current stress levels and recent work changes\n- Sleep schedule and hydration habits\n- Any medications you're taking\n- What helps or makes them worse\n\n**Questions to ask your doctor:**\n- Do my symptoms suggest a specific type of headache?\n- Should I be concerned about the light sensitivity?\n- What tests, if any, might be helpful?\n- Are there lifestyle changes that could help?\n- When should I follow up or seek urgent care?\n\n**Before your appointment:**\n- Keep a headache diary for a few days\n- Note your water intake and sleep hours\n- List any medications or supplements\n\nThis preparation will help your doctor provide the most accurate assessment and treatment plan.",
    timestamp: new Date()
  }
];

const probableDiagnoses = [
  {
    condition: "Tension-Type Headache",
    probability: 45,
    description: "Most common type of headache, often stress-related",
    severity: "mild" as const
  },
  {
    condition: "Migraine without Aura",
    probability: 30,
    description: "Moderate to severe headache with light sensitivity",
    severity: "moderate" as const
  },
  {
    condition: "Caffeine Withdrawal",
    probability: 15,
    description: "Headaches from changes in caffeine consumption",
    severity: "mild" as const
  },
  {
    condition: "Eye Strain (Digital)",
    probability: 10,
    description: "Headaches from prolonged screen time",
    severity: "mild" as const
  }
];

export const DemoConversation = () => {
  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-4">
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

            {/* Probable Diagnoses Card */}
            <div className="mt-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <TrendingUp className="h-5 w-5" />
                    Probable Diagnoses
                  </CardTitle>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Based on the symptoms discussed, here are the most likely conditions to explore with your healthcare provider:
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {probableDiagnoses.map((diagnosis, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {diagnosis.condition}
                          </h4>
                          <Badge 
                            variant={
                              diagnosis.severity === 'mild' ? 'secondary' :
                              diagnosis.severity === 'moderate' ? 'default' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {diagnosis.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {diagnosis.description}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {diagnosis.probability}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          likelihood
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
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