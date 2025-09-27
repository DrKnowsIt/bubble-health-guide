import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useNavigationDebounce } from "@/hooks/useNavigationDebounce";
import { AIFreeModeInterface } from './AIFreeModeInterface';

interface FreeUsersOnlyGateProps {
  children: ReactNode;
}

export const FreeUsersOnlyGate = ({ children }: FreeUsersOnlyGateProps) => {
  const { subscribed, subscription_tier, loading } = useSubscription();
  const location = useLocation();
  const { debouncedNavigate, currentPath } = useNavigationDebounce();

  // Show loading state while checking subscription
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user has a subscription (Basic or Pro), show upgrade message
  if (subscribed && subscription_tier) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="h-8 w-8 text-primary" />
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">You Have Full AI Chat!</CardTitle>
            <CardDescription className="text-base">
              As a {subscription_tier === 'pro' ? 'Pro' : 'Basic'} subscriber, you have access to our advanced AI Chat with unlimited conversations and personalized responses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              AI Free Mode is designed for free users with limited features. You have access to the full AI experience!
            </p>
            <Button 
              onClick={() => {
                const targetPath = '/dashboard?tab=chat';
                // Only navigate if not already on the target path
                if (currentPath !== targetPath) {
                  console.log('FreeUsersOnlyGate: Navigating to AI Chat from:', currentPath);
                  debouncedNavigate(targetPath, { replace: true });
                } else {
                  console.log('FreeUsersOnlyGate: Already on AI Chat tab');
                }
              }} 
              disabled={currentPath === '/dashboard?tab=chat'}
              className="w-full"
            >
              {currentPath === '/dashboard?tab=chat' ? 'You are here' : 'Go to AI Chat'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Free users get the AI Free Mode interface
  return <AIFreeModeInterface patientId={undefined} />;
};