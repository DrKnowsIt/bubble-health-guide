import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from './use-toast';

interface ConversationState {
  conversationId: string | null;
  selectedUserId: string | null;
  lastActivity: number;
  messages: any[];
}

export const useConversationStateGuard = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const stateBackupRef = useRef<ConversationState | null>(null);

  // Save conversation state before navigation or auth loss
  const saveConversationState = useCallback((state: ConversationState) => {
    if (!user?.id) return;
    
    try {
      const stateKey = `conversation_state_${user.id}`;
      const stateData = {
        ...state,
        lastActivity: Date.now(),
        path: location.pathname
      };
      
      localStorage.setItem(stateKey, JSON.stringify(stateData));
      stateBackupRef.current = state;
      
      console.log('💾 Conversation state saved:', {
        conversationId: state.conversationId,
        path: location.pathname,
        messagesCount: state.messages?.length || 0
      });
    } catch (error) {
      console.error('❌ Failed to save conversation state:', error);
    }
  }, [user?.id, location.pathname]);

  // Restore conversation state after auth recovery
  const restoreConversationState = useCallback((): ConversationState | null => {
    if (!user?.id) return null;
    
    try {
      const stateKey = `conversation_state_${user.id}`;
      const stored = localStorage.getItem(stateKey);
      
      if (!stored) return null;
      
      const state = JSON.parse(stored);
      
      // Check if state is recent (less than 1 hour old)
      if (Date.now() - state.lastActivity > 3600000) {
        localStorage.removeItem(stateKey);
        return null;
      }
      
      console.log('🔄 Conversation state restored:', {
        conversationId: state.conversationId,
        path: state.path,
        messagesCount: state.messages?.length || 0
      });
      
      return state;
    } catch (error) {
      console.error('❌ Failed to restore conversation state:', error);
      return null;
    }
  }, [user?.id]);

  // Clear conversation state
  const clearConversationState = useCallback(() => {
    if (!user?.id) return;
    
    try {
      const stateKey = `conversation_state_${user.id}`;
      localStorage.removeItem(stateKey);
      stateBackupRef.current = null;
      console.log('🗑️ Conversation state cleared');
    } catch (error) {
      console.error('❌ Failed to clear conversation state:', error);
    }
  }, [user?.id]);

  // Monitor auth state changes and handle redirects
  useEffect(() => {
    // Skip during initial loading
    if (loading) return;

    // User lost authentication while on protected route
    if (!user && location.pathname === '/dashboard') {
      console.warn('⚠️ User lost authentication on dashboard, redirecting to auth');
      
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to access your conversations.",
      });
      
      navigate('/auth', { 
        state: { 
          from: location,
          message: "Your session expired. Please sign in to continue." 
        },
        replace: true 
      });
      return;
    }

    // User authenticated and on homepage, redirect to dashboard
    if (user && location.pathname === '/') {
      console.log('✅ User authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
      return;
    }

    // User authenticated, try to restore conversation state
    if (user && location.pathname === '/dashboard') {
      const restoredState = restoreConversationState();
      if (restoredState) {
        toast({
          title: "Welcome back!",
          description: "Your previous conversation has been restored.",
        });
      }
    }
  }, [user, loading, location.pathname, navigate, toast, restoreConversationState]);

  // Handle conversation state errors
  const handleConversationError = useCallback((error: string, details?: any) => {
    console.error('💬 Conversation error:', error, details);
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to access your conversations.",
      });
      navigate('/auth');
      return;
    }

    // Show user-friendly error message
    toast({
      variant: "destructive",
      title: "Conversation Error",
      description: error,
    });
  }, [user, navigate, toast]);

  return {
    saveConversationState,
    restoreConversationState,
    clearConversationState,
    handleConversationError,
    hasStoredState: !!stateBackupRef.current
  };
};