import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
    content: "Hello! I'm DrKnowsIt, your AI health assistant. How can I help you today?",
    timestamp: new Date()
  },
  {
    id: 'user1',
    type: 'user',
    content: "I've been getting headaches every afternoon for the past week",
    timestamp: new Date()
  },
  {
    id: 'ai1',
    type: 'ai',
    content: "I'd like to help you understand what might be causing these headaches. Where exactly does it hurt? Is it on one side of your head, both sides, or more in the front/back?",
    timestamp: new Date()
  },
  {
    id: 'user2',
    type: 'user',
    content: "It's mostly on both sides, kind of like a band around my head",
    timestamp: new Date()
  },
  {
    id: 'ai2',
    type: 'ai',
    content: "That's helpful information. A few more questions: Have you been under more stress than usual? How's your sleep been? And are you drinking enough water throughout the day?",
    timestamp: new Date()
  },
  {
    id: 'user3',
    type: 'user',
    content: "Actually yes, work has been really stressful and I haven't been sleeping well",
    timestamp: new Date()
  },
  {
    id: 'ai3',
    type: 'ai',
    content: "Based on what you're telling me, this sounds like it could be tension headaches, which are often triggered by stress and poor sleep. Here are some things that might help...",
    timestamp: new Date()
  }
];


export const DemoConversation = () => {
  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-background">
      {/* Main Content - Mobile-First Responsive Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full gap-2 p-3 max-w-full overflow-hidden">
          {/* Chat Messages - Mobile optimized */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-[50vh] max-w-full">
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
                          : "bg-primary text-primary-foreground"
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