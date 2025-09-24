import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, Info } from 'lucide-react';
import { useTokenLimiting } from '@/hooks/useTokenLimiting';
import { formatTimeUntilReset, TOKEN_LIMIT } from '@/utils/tokenLimiting';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

export const TokenUsagePanel = () => {
  const { user } = useAuth();
  const { tokenStatus, currentTokens, timeUntilReset, canChat } = useTokenLimiting();
  const [timeLeft, setTimeLeft] = useState(timeUntilReset);

  // Update countdown every second
  useEffect(() => {
    setTimeLeft(timeUntilReset);
    
    if (timeUntilReset > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1000));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timeUntilReset]);

  if (!user) return null;

  const tokenPercentage = (currentTokens / TOKEN_LIMIT) * 100;
  const isNearLimit = currentTokens >= TOKEN_LIMIT * 0.8;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Token Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
            <Zap className={`h-4 w-4 ${isNearLimit ? 'text-warning' : 'text-primary'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentTokens}</div>
            <p className="text-xs text-muted-foreground">
              of {TOKEN_LIMIT} tokens used
            </p>
            <div className="mt-3">
              <Progress value={tokenPercentage} className="h-2" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant={canChat ? "default" : "destructive"}>
                {canChat ? "Ready to chat" : "Timeout active"}
              </Badge>
              {isNearLimit && canChat && (
                <span className="text-xs text-warning">
                  Approaching limit
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!canChat && timeLeft > 0 ? (
              <>
                <div className="text-2xl font-bold text-destructive">
                  {formatTimeUntilReset(timeLeft)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Until chat is available again
                </p>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      30-minute break after {TOKEN_LIMIT} tokens
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  Ready
                </div>
                <p className="text-xs text-muted-foreground">
                  You can continue chatting
                </p>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      {TOKEN_LIMIT - currentTokens} tokens remaining
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Token Limiting Works
          </CardTitle>
          <CardDescription>
            Simple and fair usage system
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
                  <span>• Timeout duration:</span>
                  <Badge variant="secondary">30 minutes</Badge>
                </div>
                <div>• Tokens reset automatically after each timeout</div>
                <div>• Simple questions use ~10-50 tokens</div>
                <div>• Complex analysis uses ~100-200 tokens</div>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm">
                <strong>💡 This keeps our AI healthy</strong>
                <div className="text-muted-foreground mt-1">
                  Just like ChatGPT and Claude, we need short breaks to provide you with the best medical insights.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};