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

    // Simple, reliable redirects for authenticated users
    if (user && location.pathname === '/' && lastRedirectRef.current !== 'dashboard') {
      console.log('Auth redirect: User authenticated, redirecting from home to dashboard');
      lastRedirectRef.current = 'dashboard';
      debouncedNavigate('/dashboard', { replace: true });
    }
    
    // Always redirect from auth page if authenticated
    if (user && location.pathname === '/auth' && lastRedirectRef.current !== 'dashboard') {
      console.log('Auth redirect: User authenticated, redirecting from auth to dashboard');
      lastRedirectRef.current = 'dashboard';
      debouncedNavigate('/dashboard', { replace: true });
    }

    // Reset redirect tracking when user changes
    if (!user) {
      lastRedirectRef.current = '';
    }
  }, [user, loading, debouncedNavigate, location.pathname]);
};