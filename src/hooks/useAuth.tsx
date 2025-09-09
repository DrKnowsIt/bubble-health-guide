import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  showLegalModal: boolean;
  setShowLegalModal: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, accessCode?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const isIntentionalSignOutRef = useRef(false);
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

  // Monitor session every minute and add activity-based extension
  useEffect(() => {
    if (session && !loading) {
      const interval = setInterval(monitorSession, 60000);
      
      // Activity-based session extension
      const handleUserActivity = () => {
        const now = new Date().getTime() / 1000;
        const expiresAt = session.expires_at;
        
        // If session expires in the next 10 minutes and user is active, extend it
        if (expiresAt - now < 600) {
          supabase.auth.refreshSession().then(({ error }) => {
            if (!error) {
              console.log('✅ Session extended due to user activity');
            }
          });
        }
      };

      // Listen for user activity (clicks, keystrokes, mouse movement)
      const events = ['click', 'keydown', 'mousemove', 'scroll'];
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, { passive: true });
      });

      return () => {
        clearInterval(interval);
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity);
        });
      };
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
          // Check if this was an unexpected logout (not intentional)
          const currentSession = JSON.parse(localStorage.getItem('sb-lwqfurkfjkilsnjtmemj-auth-token') || 'null');
          if (!isIntentionalSignOutRef.current && !currentSession) {
            console.warn('⚠️ Unexpected logout detected - session lost from storage');
            toast({
              variant: "destructive",
              title: "Session Lost",
              description: "You were signed out unexpectedly. Please sign in again.",
            });
          }
          // Reset the intentional sign out flag
          isIntentionalSignOutRef.current = false;
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
        
        // Check legal agreement status after sign in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            checkLegalAgreementStatus(session.user.id);
          }, 0);
        }
        
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

  // Function to check legal agreement status
  const checkLegalAgreementStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('medical_disclaimer_accepted')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error checking legal agreement status:', error);
        return;
      }

      const hasAccepted = data?.medical_disclaimer_accepted || false;
      
      if (!hasAccepted) {
        console.log('User has not accepted legal agreement, showing modal');
        setShowLegalModal(true);
      } else {
        console.log('User has accepted legal agreement');
        setShowLegalModal(false);
      }
    } catch (error) {
      console.error('Error checking legal agreement status:', error);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setAuthLoading(true);
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
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, accessCode?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Check if access code is the alpha tester code
      const isValidTesterCode = accessCode === 'DRKNOWSIT_ALPHA_2024';
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            alpha_tester: isValidTesterCode,
            access_code: accessCode, // Store for potential future use
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
        const successMessage = isValidTesterCode 
          ? "Account created with alpha tester access! Please check your email to verify your account."
          : "Please check your email to verify your account.";
        
        toast({
          title: "Account Created!",
          description: successMessage,
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
      setAuthLoading(true);
      
      // Mark this as an intentional sign out to prevent false "session lost" warnings
      isIntentionalSignOutRef.current = true;
      
      // Close legal modal if open
      setShowLegalModal(false);
      
      const { error } = await supabase.auth.signOut();
      if (!error) {
        toast({
          title: "Signed Out",
          description: "You've been signed out successfully.",
        });
      }
    } catch (error) {
      // Reset flag on error
      isIntentionalSignOutRef.current = false;
      toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: "An error occurred while signing out.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    authLoading,
    showLegalModal,
    setShowLegalModal,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Make sure useAuth is properly exported as a named export
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};