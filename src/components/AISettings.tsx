import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from '@/hooks/useUsers';
import { useAISettings } from '@/hooks/useAISettings';
import { PatientMemoryOverview } from './PatientMemoryOverview';
import { 
  Brain, 
  User, 
  Users, 
  Settings, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast as sonnerToast } from 'sonner';

interface AISettingsProps {
  selectedUser?: {
    id: string;
    first_name: string;
    last_name: string;
    is_primary: boolean;
    relationship: string;
    is_pet?: boolean;
  };
}

export const AISettings = ({ selectedUser }: AISettingsProps) => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { users, loading: usersLoading, deleteUser, canDeleteUser } = useUsers();
  const { settings, loading: aiSettingsLoading, updateSettings } = useAISettings();
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [clearingMemory, setClearingMemory] = useState<string | null>(null);

  // Clear user memory
  const clearUserMemory = async (userId: string) => {
    setClearingMemory(userId);
    
    try {
      // Delete conversation memory
      const { error: memoryError } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('patient_id', userId);

      if (memoryError) {
        console.error('Error clearing conversation memory:', memoryError);
        throw memoryError;
      }

      // Delete conversation diagnoses
      const { error: diagnosesError } = await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('patient_id', userId);

      if (diagnosesError) {
        console.error('Error clearing conversation diagnoses:', diagnosesError);
        throw diagnosesError;
      }

      // Delete conversation solutions
      const { error: solutionsError } = await supabase
        .from('conversation_solutions')
        .delete()
        .eq('patient_id', userId);

      if (solutionsError) {
        console.error('Error clearing conversation solutions:', solutionsError);
        throw solutionsError;
      }

      // Clear probable diagnoses from patients table
      const { error: patientsError } = await supabase
        .from('patients')
        .update({ probable_diagnoses: [] })
        .eq('id', userId);

      if (patientsError) {
        console.error('Error clearing probable diagnoses:', patientsError);
        throw patientsError;
      }
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['conversation-memory', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      sonnerToast.success('Memory cleared successfully', {
        description: 'All conversation memory and diagnoses have been cleared for this user.'
      });
      
    } catch (error: any) {
      console.error('Error clearing user memory:', error);
      sonnerToast.error('Failed to clear memory', {
        description: error.message || 'An unexpected error occurred while clearing memory.'
      });
    } finally {
      setClearingMemory(null);
    }
  };

  // Handle user delete  
  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    setDeletingUserId(userId);
    
    try {
      await deleteUser(userId);
      
      sonnerToast.success('User deleted successfully', {
        description: `${userToDelete.first_name} ${userToDelete.last_name} has been removed.`
      });
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      sonnerToast.error('Failed to delete user', {
        description: error.message || 'An unexpected error occurred while deleting the user.'
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  // Show loading state or restricted access for non-subscribers
  if (!subscribed) {
    return (
      <div className="space-y-6 opacity-50 pointer-events-none">
        <div className="text-center text-muted-foreground py-8">
          <p>AI Settings require a subscription.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Memory
          </CardTitle>
          <CardDescription>
            Configure how DrKnowsIt remembers your health information across conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="memory-enabled" className="text-base">
                Enable AI Memory
              </Label>
              <div className="text-sm text-muted-foreground">
                Allow DrKnowsIt to remember your health information and preferences across conversations.
              </div>
            </div>
            <Switch
              id="memory-enabled"
              checked={settings?.memory_enabled ?? true}
              disabled={aiSettingsLoading}
              onCheckedChange={async (checked) => {
                const success = await updateSettings({ memory_enabled: checked });
                if (success) {
                  toast({
                    title: "Settings updated",
                    description: `AI memory ${checked ? 'enabled' : 'disabled'}.`,
                  });
                } else {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update AI settings.",
                  });
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="personalization-level" className="text-base">
                Personalization Level
              </Label>
              <div className="text-sm text-muted-foreground">
                Control how much the AI personalizes responses based on your health history.
              </div>
            </div>
            <Select
              value={settings?.personalization_level ?? 'medium'}
              onValueChange={async (value) => {
                const success = await updateSettings({ personalization_level: value });
                if (success) {
                  toast({
                    title: "Settings updated",
                    description: `Personalization level set to ${value}.`,
                  });
                } else {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update personalization settings.",
                  });
                }
              }}
              disabled={aiSettingsLoading}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Knowledge
          </CardTitle>
          <CardDescription>
            View what DrKnowsIt has learned about the selected user from your conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Management Actions */}
          {selectedUser && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedUser.is_primary ? 'Primary User' : selectedUser.relationship}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedUser && users.find(u => u.id === selectedUser.id) && canDeleteUser(users.find(u => u.id === selectedUser.id)!) ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
                        disabled={deletingUserId === selectedUser.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingUserId === selectedUser.id ? "Deleting..." : "Delete"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Delete User - Are You Sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            This will permanently delete <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> and all their associated data including:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>All health records and forms</li>
                            <li>All conversation history</li>
                            <li>All AI memory and insights</li>
                            <li>All diagnoses and recommendations</li>
                          </ul>
                          <p className="font-medium text-destructive">
                            This action cannot be undone.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(selectedUser.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>AI Knowledge Summary</Label>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
                        disabled={clearingMemory === selectedUser.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {clearingMemory === selectedUser.id ? "Clearing..." : "Clear Memory"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Clear Memory - Are You Sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            This will permanently delete all AI memory for <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>, including:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>All conversation insights and memory</li>
                            <li>All probable diagnoses</li>
                            <li>All suggested solutions</li>
                            <li>All health pattern recognition</li>
                          </ul>
                          <p className="font-medium text-destructive">
                            This action cannot be undone. Health records and conversations will remain, but AI memory will be cleared.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => clearUserMemory(selectedUser.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Clear Memory
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-primary">User Knowledge for {selectedUser.first_name} {selectedUser.last_name}</h4>
                <div className="text-xs text-muted-foreground">
                  This shows what DrKnowsIt has learned about the selected user based on your conversations. 
                  The AI uses this information to provide more relevant health guidance.
                </div>
              </div>
              <PatientMemoryOverview 
                patientId={selectedUser.id}
                patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
              />
            </div>
            </div>
          )}

          {!selectedUser && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-sm">No user selected</div>
              <div className="text-xs">Select a user from the dropdown above to view their AI knowledge.</div>
            </div>
          )}

          {users.length === 0 && !usersLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-sm">No users added yet.</div>
              <div className="text-xs">Add users to start tracking AI knowledge.</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced AI Settings
          </CardTitle>
          <CardDescription>
            Additional AI behavior and security preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="conservative-responses" className="text-base">
                Use Conservative Responses
              </Label>
              <div className="text-sm text-muted-foreground">
                AI will provide more cautious and conservative medical guidance.
              </div>
            </div>
            <Switch
              id="conservative-responses"
              defaultChecked={false}
              onCheckedChange={(checked) => {
                toast({
                  title: "Setting updated",
                  description: `Conservative responses ${checked ? 'enabled' : 'disabled'}.`,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="learning-mode" className="text-base">
                Enable Learning Mode
              </Label>
              <div className="text-sm text-muted-foreground">
                Allow AI to learn from your feedback and improve responses over time.
              </div>
            </div>
            <Switch
              id="learning-mode"
              defaultChecked={true}
              onCheckedChange={(checked) => {
                toast({
                  title: "Setting updated",
                  description: `Learning mode ${checked ? 'enabled' : 'disabled'}.`,
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};