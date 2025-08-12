import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export const useAuthRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // Don't redirect if on auth, settings, or pricing pages
    if (location.pathname === '/auth' || location.pathname === '/settings' || location.pathname === '/pricing') return;

    // If user is authenticated and not already on dashboard, redirect to dashboard
    if (user && location.pathname !== '/dashboard') {
      console.log('Auth redirect: User authenticated, redirecting to dashboard from:', location.pathname);
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);
};