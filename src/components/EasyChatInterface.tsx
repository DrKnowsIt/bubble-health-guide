import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, CheckCircle, RefreshCw, AlertTriangle, Brain, Target, Send } from 'lucide-react';
import { useEasyChat } from '@/hooks/useEasyChat';
import { EasyChatTopicsPanel } from './EasyChatTopicsPanel';

interface EasyChatInterfaceProps {
  patientId?: string;
  selectedAnatomy?: string[];
  onFinish?: () => void;
  onRestart?: () => void;
  useEasyChatHook?: any; // Allow flexibility for enhanced hook
}

export const EasyChatInterface = ({ 
  patientId, 
  selectedAnatomy, 
  onFinish,
  onRestart,
  useEasyChatHook
}: EasyChatInterfaceProps) => {
  // Use provided hook or create new one
  const hookData = useEasyChatHook || useEasyChat(patientId);
  const {
    currentQuestion,
    currentSession,
    conversationPath,
    loading,
    startNewSession,
    submitResponse,
    submitTextResponse,
    getResponseOptions,
    isCompleted,
    hasActiveSession,
    hasResponses
  } = hookData;

  // Local state for text input mode
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    // Auto-start session when component mounts
    if (!currentSession && !loading) {
      startNewSession();
    }
  }, [currentSession, loading, startNewSession]);

  const handleResponseClick = (value: string, text: string) => {
    if (value === 'other_concerns') {
      setShowTextInput(true);
      return;
    }
    submitResponse(value, text);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    
    if (submitTextResponse) {
      submitTextResponse(textInput.trim());
    } else {
      submitResponse('other_concerns', textInput.trim());
    }
    
    setTextInput('');
    setShowTextInput(false);
  };

  const handleBackToOptions = () => {
    setShowTextInput(false);
    setTextInput('');
  };

  const handleStartOver = () => {
    startNewSession();
  };

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    } else {
      startNewSession();
    }
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
        {/* Selected Anatomy & Progress indicator */}
        <div className="flex items-center justify-between mb-2">
          {selectedAnatomy && selectedAnatomy.length > 0 && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <div className="flex flex-wrap gap-1">
                {selectedAnatomy.slice(0, 3).map((area) => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
                {selectedAnatomy.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedAnatomy.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          {conversationPath.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {conversationPath.length} questions answered • AI evaluating health topics
            </div>
          )}
        </div>

        {/* Current Question or Summary - Main Content */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1">
            <CardContent className="p-6">
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

                {onFinish && (
                  <Button 
                    onClick={onFinish}
                    className="w-full"
                  >
                    Export Results
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={handleRestart}
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
                    {hasActiveSession && hasResponses && (
                      <Badge variant="outline" className="ml-1">In Progress</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 leading-tight">
                    {currentQuestion.question_text}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Please select the option that best describes your situation:
                  </p>
                </div>

                {showTextInput ? (
                  <div className="space-y-4">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        Please describe your other health concerns in detail:
                      </p>
                    </div>
                    <Textarea
                      placeholder="Type your concerns here... (e.g., I've been experiencing headaches and fatigue lately)"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      maxLength={200}
                      className="min-h-[100px] resize-none"
                      disabled={loading}
                    />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Describe your specific concerns (up to 200 characters)</span>
                      <span className={textInput.length > 180 ? "text-orange-500" : ""}>
                        {textInput.length}/200
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || loading}
                        className="flex-1"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit Concerns
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleBackToOptions}
                        disabled={loading}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
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
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-border space-y-2">
                  {onFinish && conversationPath.length > 2 && (
                    <Button 
                      onClick={onFinish}
                      className="w-full"
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finish & Export Results
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={handleRestart}
                    className="w-full"
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart Analysis
                  </Button>
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{conversationPath.length >= 3 ? 'Analyzing your responses for health topics...' : 'Processing your response...'}</span>
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
                <div className="flex gap-2 justify-center">
                  <Button onClick={startNewSession} disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Starting...
                      </>
                    ) : (
                      hasActiveSession ? 'New Chat' : 'Begin Easy Chat'
                    )}
                  </Button>
                  {hasActiveSession && (
                    <Button variant="outline" onClick={startNewSession} disabled={loading}>
                      Restart
                    </Button>
                  )}
                </div>
              </div>
            )}
            </CardContent>
          </ScrollArea>
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
