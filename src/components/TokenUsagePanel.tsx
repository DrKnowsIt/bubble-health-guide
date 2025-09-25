import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TOKEN_LIMIT } from '@/utils/tokenLimiting';

export const TokenUsagePanel = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* How It Works - Now shows generic info since client-side polling is removed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Token Limiting Works
          </CardTitle>
          <CardDescription>
            Modern error-based rate limiting system
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
                <div>• No more polling - timeout shows when limit reached</div>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm">
                <strong>💡 Modern approach like OpenAI & Claude</strong>
                <div className="text-muted-foreground mt-1">
                  DrKnowsIt uses server-side rate limiting with immediate error responses, just like ChatGPT and Claude. You'll only see a timeout notification when you actually hit the limit.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};