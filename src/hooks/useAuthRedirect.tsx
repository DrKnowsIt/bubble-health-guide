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

    // Check if user just arrived or has been on dashboard recently to prevent excessive redirects
    const lastVisit = sessionStorage.getItem('lastDashboardVisit');
    const recentVisit = lastVisit && (Date.now() - parseInt(lastVisit)) < 30000; // 30 seconds

    // Only redirect from home page if user hasn't visited dashboard recently
    if (user && location.pathname === '/' && !recentVisit && lastRedirectRef.current !== 'dashboard') {
      console.log('Auth redirect: User authenticated, redirecting from home to dashboard');
      lastRedirectRef.current = 'dashboard';
      sessionStorage.setItem('lastDashboardVisit', Date.now().toString());
      debouncedNavigate('/dashboard', { replace: true });
    }
    
    // Always redirect from auth page if authenticated
    if (user && location.pathname === '/auth' && lastRedirectRef.current !== 'dashboard') {
      console.log('Auth redirect: User authenticated, redirecting from auth to dashboard');
      lastRedirectRef.current = 'dashboard';
      sessionStorage.setItem('lastDashboardVisit', Date.now().toString());
      debouncedNavigate('/dashboard', { replace: true });
    }

    // Update dashboard visit timestamp when on dashboard
    if (user && location.pathname === '/dashboard') {
      sessionStorage.setItem('lastDashboardVisit', Date.now().toString());
    }

    // Reset redirect tracking when user changes
    if (!user) {
      lastRedirectRef.current = '';
      sessionStorage.removeItem('lastDashboardVisit');
    }
  }, [user, loading, debouncedNavigate, location.pathname]);
};