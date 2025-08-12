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

    // Allow browsing marketing pages; only redirect away from the auth page
    if (user && location.pathname === '/auth') {
      console.log('Auth redirect: User authenticated, redirecting from auth to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);
};