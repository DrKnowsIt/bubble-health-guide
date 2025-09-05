import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SessionExtensionPrompt = () => {
  const { session } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!session) return;

    const checkSessionTime = () => {
      const now = new Date().getTime() / 1000;
      const expiresAt = session.expires_at;
      const remaining = expiresAt - now;

      setTimeRemaining(Math.max(0, remaining));

      // Show prompt when 5 minutes remaining
      if (remaining <= 300 && remaining > 0 && !showPrompt) {
        setShowPrompt(true);
      }
    };

    const interval = setInterval(checkSessionTime, 1000);
    checkSessionTime();

    return () => clearInterval(interval);
  }, [session, showPrompt]);

  const handleExtendSession = async () => {
    // Session will be automatically extended by the activity listener in useAuth
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || timeRemaining <= 0) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="border-warning bg-warning/5 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-warning" />
            <span>Session Expiring Soon</span>
            <Badge variant="outline" className="text-xs">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Your session will expire soon. Stay logged in to continue your health consultation.
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleExtendSession}
              className="flex-1 text-xs h-7"
            >
              <Shield className="h-3 w-3 mr-1" />
              Stay Logged In
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDismiss}
              className="text-xs h-7"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};