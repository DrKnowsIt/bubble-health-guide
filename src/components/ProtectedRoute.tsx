import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  // Debug logging for protected route access
  console.log('ProtectedRoute check:', {
    currentPath: location.pathname,
    userId: user?.id || 'null',
    hasSession: !!session,
    loading
  });

  if (loading) {
    console.log('ProtectedRoute - Showing loading state');
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
    console.log('ProtectedRoute - Redirecting to auth, missing:', {
      user: !user,
      session: !session
    });
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  console.log('ProtectedRoute - Access granted for:', location.pathname);
  return <>{children}</>;
};