import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  logger.debug('ProtectedRoute check:', {
    currentPath: location.pathname,
    userId: user?.id || 'null',
    hasSession: !!session,
    loading
  });

  if (loading) {
    logger.debug('ProtectedRoute - Showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    logger.debug('ProtectedRoute - Redirecting to auth, missing:', {
      user: !user,
      session: !session
    });
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  logger.debug('ProtectedRoute - Access granted for:', location.pathname);
  return <>{children}</>;
};