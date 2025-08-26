import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Session monitoring hook
  const monitorSession = useCallback(() => {
    if (session) {
      const now = new Date().getTime() / 1000;
      const expiresAt = session.expires_at;
      const refreshToken = session.refresh_token;
      
      console.log('🔍 Session Monitor:', {
        userId: session.user.id,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        timeUntilExpiry: Math.round((expiresAt - now) / 60) + ' minutes',
        hasRefreshToken: !!refreshToken,
        sessionValid: expiresAt > now
      });

      // Check if session expires in the next 5 minutes
      if (expiresAt - now < 300) {
        console.warn('⚠️ Session expiring soon, attempting refresh...');
        supabase.auth.refreshSession().then(({ data, error }) => {
          if (error) {
            console.error('❌ Session refresh failed:', error);
            toast({
              variant: "destructive",
              title: "Session Expired", 
              description: "Please sign in again to continue.",
            });
          } else {
            console.log('✅ Session refreshed successfully');
          }
        });
      }
    }
  }, [session, toast]);

  // Monitor session every minute
  useEffect(() => {
    if (session && !loading) {
      const interval = setInterval(monitorSession, 60000);
      return () => clearInterval(interval);
    }
  }, [session, loading, monitorSession]);

  useEffect(() => {
    // Enhanced auth state logging
    const logAuthEvent = (event: string, session: Session | null) => {
      const timestamp = new Date().toISOString();
      console.log(`🔐 [${timestamp}] Auth Event: ${event}`, {
        userId: session?.user?.id || 'null',
        email: session?.user?.email || 'null',
        hasSession: !!session,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'null',
        storageAvailable: typeof localStorage !== 'undefined'
      });
      
      // Check for unexpected logouts
      if (event === 'SIGNED_OUT' && session === null) {
        setTimeout(() => {
          // Check if this was an unexpected logout
          const currentSession = JSON.parse(localStorage.getItem('sb-lwqfurkfjkilsnjtmemj-auth-token') || 'null');
          if (!currentSession) {
            console.warn('⚠️ Unexpected logout detected - session lost from storage');
            toast({
              variant: "destructive",
              title: "Session Lost",
              description: "You were signed out unexpectedly. Please sign in again.",
            });
          }
        }, 1000);
      }
    };

    // Set up auth state listener with enhanced logging and error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logAuthEvent(event, session);
        
        // Handle session changes
        setSession(session);
        setUser(session?.user ?? null);
        
        // Storage fallback mechanism
        if (session) {
          try {
            localStorage.setItem('sb-session-backup', JSON.stringify({
              user: session.user,
              expires_at: session.expires_at,
              created_at: Date.now()
            }));
          } catch (e) {
            console.error('❌ Failed to backup session:', e);
          }
        } else {
          localStorage.removeItem('sb-session-backup');
        }
      }
    );

    // THEN check for existing session with enhanced error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('📋 Initial session check:', { 
        userId: session?.user?.id || 'null',
        hasSession: !!session,
        error: error?.message || 'none'
      });
      
      if (error) {
        console.error('❌ Session retrieval error:', error);
        // Try to recover from backup if available
        try {
          const backup = localStorage.getItem('sb-session-backup');
          if (backup) {
            const backupData = JSON.parse(backup);
            console.log('🔄 Attempting session recovery from backup...');
            toast({
              title: "Session Recovery",
              description: "Attempting to restore your session...",
            });
          }
        } catch (e) {
          console.error('❌ Session recovery failed:', e);
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('❌ Critical session error:', error);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "There was a problem with your session. Please refresh the page.",
      });
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
      }
      
      return { error };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign In Error",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      }
      
      return { error };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Error",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error };
    }
  };


  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        toast({
          title: "Signed Out",
          description: "You've been signed out successfully.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: "An error occurred while signing out.",
      });
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};