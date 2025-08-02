import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateMessageProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export const EmptyStateMessage = ({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction, 
  children 
}: EmptyStateMessageProps) => {
  return (
    <Card className="text-center py-8">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-md mx-auto">
          {description}
        </CardDescription>
      </CardHeader>
      {(actionLabel || children) && (
        <CardContent>
          {actionLabel && onAction && (
            <Button onClick={onAction} className="mb-4">
              {actionLabel}
            </Button>
          )}
          {children}
        </CardContent>
      )}
    </Card>
  );
};