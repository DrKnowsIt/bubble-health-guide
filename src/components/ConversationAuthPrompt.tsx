import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConversationAuthPromptProps {
  message?: string;
}

export const ConversationAuthPrompt = ({ 
  message = "Please sign in to access your conversations and chat history." 
}: ConversationAuthPromptProps) => {
  const navigate = useNavigate();

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Authentication Required
            </h3>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
          
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full"
            size="lg"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};