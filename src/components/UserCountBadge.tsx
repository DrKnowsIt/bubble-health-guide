import { Users } from 'lucide-react';
import { useUserCount } from '@/hooks/useUserCount';

interface UserCountBadgeProps {
  variant?: 'hero' | 'cta';
  className?: string;
}

export const UserCountBadge = ({ variant = 'cta', className = '' }: UserCountBadgeProps) => {
  const { userCount, loading } = useUserCount();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-muted rounded w-32"></div>
      </div>
    );
  }

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.floor(count / 100) / 10}k+`;
    }
    return `${count}+`;
  };

  if (variant === 'hero') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-primary/20 rounded-full border border-primary/20 text-sm font-medium text-primary ${className}`}>
        <Users className="h-4 w-4" />
        <span>Join {formatCount(userCount)} families using DrKnowsIt</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 text-sm font-medium text-muted-foreground ${className}`}>
      <Users className="h-4 w-4 text-primary" />
      <span>
        Trusted by <span className="text-primary font-semibold">{formatCount(userCount)} families</span> and their pets
      </span>
    </div>
  );
};