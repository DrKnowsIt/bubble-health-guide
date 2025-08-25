import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, CheckCircle, RefreshCw, AlertTriangle, Brain } from 'lucide-react';
import { useEasyChat } from '@/hooks/useEasyChat';
import { EasyChatTopicsPanel } from './EasyChatTopicsPanel';

interface EasyChatInterfaceProps {
  patientId?: string;
}

export const EasyChatInterface = ({ patientId }: EasyChatInterfaceProps) => {
  const {
    currentQuestion,
    currentSession,
    conversationPath,
    loading,
    startNewSession,
    submitResponse,
    getResponseOptions,
    isCompleted
  } = useEasyChat(patientId);

  useEffect(() => {
    // Auto-start session when component mounts
    if (!currentSession && !loading) {
      startNewSession();
    }
  }, [currentSession, loading, startNewSession]);

  const handleResponseClick = (value: string, text: string) => {
    submitResponse(value, text);
  };

  const handleStartOver = () => {
    startNewSession();
  };

  if (loading && !currentQuestion) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Starting Easy Chat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* Main Chat Area - Left Side */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        {/* Progress indicator */}
        {conversationPath.length > 0 && (
          <div className="text-xs text-muted-foreground mb-2">
            Progress: {conversationPath.length} questions answered
          </div>
        )}

        {/* Current Question or Summary - Main Content */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardContent className="p-6 flex-1 overflow-y-auto">
            {isCompleted ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="font-semibold">Session Complete!</h3>
                </div>
                
                {currentSession?.final_summary && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-line">
                      {currentSession.final_summary}
                    </p>
                  </div>
                )}

                <Separator />
                
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Want more detailed analysis and personalized AI conversations?
                  </p>
                  <Button className="w-full">
                    Upgrade for Full AI Chat
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  onClick={handleStartOver}
                  className="w-full"
                >
                  Start New Easy Chat
                </Button>
              </div>
            ) : currentQuestion ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">Easy Chat</span>
                    <Badge variant="secondary" className="ml-2">Free</Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 leading-tight">
                    {currentQuestion.question_text}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Please select the option that best describes your situation:
                  </p>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {getResponseOptions().map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto px-3 py-2 hover:bg-primary/5 hover:border-primary/20 w-full"
                      onClick={() => handleResponseClick(option.value, option.text)}
                      disabled={loading}
                    >
                      <span className="whitespace-normal text-sm leading-snug">
                        {option.text}
                      </span>
                    </Button>
                  ))}
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing your response...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">Easy Chat</h3>
                    <Badge variant="secondary" className="mt-1">Free</Badge>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  Get personalized health guidance through our guided conversation
                </p>
                <Button onClick={startNewSession} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    'Begin Easy Chat'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - Health Topics */}
      <div className="w-80 flex-shrink-0">
        <EasyChatTopicsPanel
          conversationPath={conversationPath}
          patientName={patientId ? "Patient" : "You"}
          patientId={patientId || ""}
          sessionId={currentSession?.id}
        />
      </div>
    </div>
  );
};