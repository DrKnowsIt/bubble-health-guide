import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useEasyChat } from '@/hooks/useEasyChat';

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
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Easy Chat
            <Badge variant="secondary" className="ml-2">Free</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Get personalized health guidance through our guided conversation
          </p>
        </CardHeader>
      </Card>

      {/* Conversation History */}
      {conversationPath.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Your Journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversationPath.map((item, index) => (
              <div key={index} className="border-l-2 border-primary/20 pl-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {item.question.question_text}
                </p>
                <p className="text-sm text-primary font-medium">
                  {item.response}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Question or Summary */}
      <Card className="flex-1">
        <CardContent className="p-6">
          {isCompleted ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success">
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
                <h3 className="text-lg font-semibold mb-2">
                  {currentQuestion.question_text}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please select the option that best describes your situation:
                </p>
              </div>

              <div className="grid gap-3">
                {getResponseOptions().map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start text-left h-auto p-4 hover:bg-primary/5 hover:border-primary/20"
                    onClick={() => handleResponseClick(option.value, option.text)}
                    disabled={loading}
                  >
                    <span className="whitespace-normal">{option.text}</span>
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
              <p className="text-muted-foreground mb-4">
                Ready to start your guided health conversation?
              </p>
              <Button onClick={startNewSession} disabled={loading}>
                Begin Easy Chat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};