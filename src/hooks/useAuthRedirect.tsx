import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useNavigationDebounce } from './useNavigationDebounce';

export const useAuthRedirect = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { debouncedNavigate, currentPath } = useNavigationDebounce(500);
  const lastRedirectRef = useRef<string>('');

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // Check if user is in password reset flow - don't redirect in this case
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode');
    const isPasswordResetFlow = mode === 'reset' || location.hash.includes('type=recovery');
    
    // Simple, reliable redirects for authenticated users
    if (user && location.pathname === '/' && lastRedirectRef.current !== 'dashboard') {
      console.log('Auth redirect: User authenticated, redirecting from home to dashboard');
      lastRedirectRef.current = 'dashboard';
      debouncedNavigate('/dashboard', { replace: true });
    }
    
    // Redirect from auth page if authenticated, BUT NOT during password reset flow
    if (user && location.pathname === '/auth' && lastRedirectRef.current !== 'dashboard' && !isPasswordResetFlow) {
      console.log('Auth redirect: User authenticated, redirecting from auth to dashboard');
      lastRedirectRef.current = 'dashboard';
      debouncedNavigate('/dashboard', { replace: true });
    }

    // Reset redirect tracking when user changes
    if (!user) {
      lastRedirectRef.current = '';
    }
  }, [user, loading, debouncedNavigate, location.pathname, location.search, location.hash]);
};