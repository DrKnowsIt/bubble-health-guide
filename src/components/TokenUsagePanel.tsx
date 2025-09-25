import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSimpleTokenTimeout } from '@/hooks/useSimpleTokenTimeout';
import { TOKEN_LIMIT, formatTimeUntilReset } from '@/utils/tokenLimiting';

export const TokenUsagePanel = () => {
  const { user } = useAuth();
  const { isInTimeout, timeUntilReset } = useSimpleTokenTimeout();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Token Status
          </CardTitle>
          <CardDescription>
            Your current chat availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInTimeout ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <Clock className="h-4 w-4" />
                <strong>Chat temporarily unavailable</strong>
              </div>
              <div className="text-sm text-amber-700">
                Tokens will recharge in: <strong>{formatTimeUntilReset(timeUntilReset)}</strong>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <Zap className="h-4 w-4" />
                <strong>Chat available</strong>
              </div>
              <div className="text-sm text-green-700">
                You can send messages until you reach the token limit
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            How Token Recharge Works
          </CardTitle>
          <CardDescription>
            Simple token-based rate limiting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>• Token limit per session:</span>
                  <Badge variant="secondary">{TOKEN_LIMIT} tokens</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>• Recharge duration:</span>
                  <Badge variant="secondary">30 minutes</Badge>
                </div>
                <div>• Tokens reset automatically after timeout</div>
                <div>• Simple questions use ~10-50 tokens</div>
                <div>• Complex analysis uses ~100-200 tokens</div>
                <div>• Clean and simple - no daily limits</div>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm">
                <strong>🔋 Simple Token System</strong>
                <div className="text-muted-foreground mt-1">
                  When you reach the token limit, just wait 30 minutes for a full recharge. No complex daily limits or subscription restrictions for basic chat.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};