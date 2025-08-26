import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const AuthDebugPanel = () => {
  const { user, session, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [sessionBackup, setSessionBackup] = useState<any>(null);

  useEffect(() => {
    // Only show in development
    if (import.meta.env.MODE !== 'development') return;
    
    // Check for session backup
    try {
      const backup = localStorage.getItem('sb-session-backup');
      if (backup) {
        setSessionBackup(JSON.parse(backup));
      }
    } catch (e) {
      console.error('Error reading session backup:', e);
    }
  }, [session]);

  // Only render in development mode
  if (import.meta.env.MODE !== 'development') return null;

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background border-2"
        >
          🔐 Debug
        </Button>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const getTimeUntilExpiry = () => {
    if (!session?.expires_at) return 'Unknown';
    const now = Date.now() / 1000;
    const minutes = Math.round((session.expires_at - now) / 60);
    return minutes > 0 ? `${minutes}m` : 'Expired';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-background border-2 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Auth Debug Panel</CardTitle>
            <Button 
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <Badge variant={loading ? "secondary" : user ? "default" : "destructive"}>
              {loading ? "Loading" : user ? "Authenticated" : "Not authenticated"}
            </Badge>
          </div>
          
          {user && (
            <>
              <div className="flex items-center justify-between">
                <span>User ID:</span>
                <span className="font-mono text-xs truncate max-w-32" title={user.id}>
                  {user.id.substring(0, 8)}...
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Email:</span>
                <span className="truncate max-w-32" title={user.email}>
                  {user.email}
                </span>
              </div>
            </>
          )}
          
          {session && (
            <>
              <div className="flex items-center justify-between">
                <span>Expires:</span>
                <span className="font-mono">
                  {formatTime(session.expires_at)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Time left:</span>
                <Badge variant={getTimeUntilExpiry().includes('Expired') ? "destructive" : "secondary"}>
                  {getTimeUntilExpiry()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Refresh token:</span>
                <Badge variant={session.refresh_token ? "default" : "destructive"}>
                  {session.refresh_token ? "Present" : "Missing"}
                </Badge>
              </div>
            </>
          )}
          
          <div className="flex items-center justify-between">
            <span>Storage:</span>
            <Badge variant={typeof localStorage !== 'undefined' ? "default" : "destructive"}>
              {typeof localStorage !== 'undefined' ? "Available" : "Unavailable"}
            </Badge>
          </div>
          
          {sessionBackup && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Backup Session:</div>
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="font-mono text-xs">
                  {new Date(sessionBackup.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
          
          <div className="pt-2 border-t border-border">
            <Button 
              onClick={() => {
                console.log('🔍 Current Auth State:', {
                  user,
                  session,
                  loading,
                  localStorage: {
                    authToken: localStorage.getItem('sb-lwqfurkfjkilsnjtmemj-auth-token'),
                    sessionBackup: localStorage.getItem('sb-session-backup')
                  }
                });
              }}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              Log Full State
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};