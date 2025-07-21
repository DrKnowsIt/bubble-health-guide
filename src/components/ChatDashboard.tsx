import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Mic, MicOff, Send, Bot, User, Sparkles, FileText, Download } from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const ChatDashboard = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Welcome back! I'm DrKnowItAll, ready to help with your health questions. What's on your mind today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I understand your concern. Could you tell me more about when these symptoms started?",
        "That's an important question. Let me provide some general information, but remember to consult your doctor for personalized advice.",
        "Based on what you've described, here are some general considerations. However, I'd recommend discussing this with a healthcare professional.",
        "Thank you for sharing that information. This will be added to your health profile for future reference."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: randomResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const exportConversation = () => {
    const conversationText = messages
      .map(msg => `${msg.type === 'user' ? 'You' : 'DrKnowItAll'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drknowitall-conversation-${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chat with DrKnowItAll</h1>
          <p className="text-sm text-muted-foreground">Your AI medical companion is here to help</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={exportConversation}>
            <Download className="h-4 w-4 mr-2" />
            Export Chat
          </Button>
          <Button 
            variant={isVoiceMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsVoiceMode(!isVoiceMode)}
          >
            {isVoiceMode ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            Voice Mode
          </Button>
        </div>
      </div>

      {/* Chat Container - Takes up remaining space */}
      <Card className="chat-container flex-1 flex flex-col min-h-0">
        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[80%] space-x-3 ${
                  message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "gradient-bubble text-white"
                  }`}
                >
                  {message.type === 'user' ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.type === 'user' 
                      ? "chat-bubble-user" 
                      : "chat-bubble-ai chat-bubble-enter"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bubble text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="chat-bubble-ai px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Textarea
                placeholder="Ask DrKnowItAll about your health concerns..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[50px] resize-none pr-12 bg-background border-border focus:ring-2 focus:ring-primary"
                rows={2}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={`absolute right-2 bottom-2 h-8 w-8 p-0 ${
                  isVoiceMode && "text-primary"
                }`}
              >
                {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="btn-primary h-[50px] px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Voice Mode Indicator */}
          {isVoiceMode && (
            <div className="mt-2 flex items-center justify-center space-x-2 text-sm text-primary">
              <div className="h-2 w-2 bg-primary rounded-full pulse-gentle"></div>
              <span>Voice mode active - speak your question</span>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="medical-card hover:scale-105 transition-transform cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">Symptom Checker</h3>
                <p className="text-sm text-muted-foreground">Describe your symptoms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="medical-card hover:scale-105 transition-transform cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-accent" />
              <div>
                <h3 className="font-medium text-foreground">Prepare for Visit</h3>
                <p className="text-sm text-muted-foreground">Get ready for your doctor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="medical-card hover:scale-105 transition-transform cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-8 w-8 text-secondary" />
              <div>
                <h3 className="font-medium text-foreground">Health Questions</h3>
                <p className="text-sm text-muted-foreground">Ask about medications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};