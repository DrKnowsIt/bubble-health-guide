import { Users, Plus, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserSelectionGuideProps {
  hasUsers: boolean;
  hasSelectedUser: boolean;
  onCreateUser?: () => void;
  title: string;
  description: string;
}

export const UserSelectionGuide = ({ 
  hasUsers, 
  hasSelectedUser, 
  onCreateUser, 
  title, 
  description 
}: UserSelectionGuideProps) => {
  if (!hasUsers) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Get Started
          </CardTitle>
          <CardDescription>
            Create your first user profile to begin using DrKnowsIt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add yourself or a family member to start tracking health information and having AI conversations.
          </p>
          {onCreateUser && (
            <Button onClick={onCreateUser} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First User
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!hasSelectedUser) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{title}:</strong> {description}. Please select a user from the dropdown above to continue.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};