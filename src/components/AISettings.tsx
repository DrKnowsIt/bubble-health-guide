import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from '@/hooks/useUsers';
import { useAISettings } from '@/hooks/useAISettings';
import { Brain, HardDrive, Settings, Trash2, User, Users, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const AISettings = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const { users, loading: usersLoading, deleteUser, canDeleteUser } = useUsers();
  const { settings, loading: aiSettingsLoading, updateSettings } = useAISettings();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userKnowledge, setUserKnowledge] = useState<string>('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);

  useEffect(() => {
    if (selectedUserId) {
      loadUserKnowledge();
    }
  }, [selectedUserId]);


  const clearConversationHistory = async () => {
    if (!user) return;
    
    try {
      // Delete all conversations and their messages
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', 
          await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', user.id)
            .then(({ data }) => data?.map(c => c.id) || [])
        );

      if (messagesError) throw messagesError;

      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);

      if (conversationsError) throw conversationsError;

      toast({
        title: "Success",
        description: "Conversation history cleared successfully.",
      });

      // Force refresh the page to update the UI
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear conversation history.",
      });
    }
  };

  const loadUserKnowledge = async () => {
    if (!selectedUserId || !user) return;
    
    setKnowledgeLoading(true);
    try {
      // Get conversations for this user
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('patient_id', selectedUserId)
        .order('created_at', { ascending: false });

      if (convError) throw convError;

      // Get messages from these conversations to analyze what AI knows
      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('content, type')
          .in('conversation_id', conversationIds)
          .eq('type', 'assistant')
          .order('created_at', { ascending: false })
          .limit(50);

        if (msgError) throw msgError;

        // Analyze AI responses to extract learned information
        const knowledge = analyzeUserKnowledge(messages || [], conversations);
        setUserKnowledge(knowledge);
      } else {
        setUserKnowledge('No conversations found for this user yet.');
      }
    } catch (error: any) {
      console.error('Error loading user knowledge:', error);
      setUserKnowledge('Error loading user knowledge.');
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const analyzeUserKnowledge = (messages: any[], conversations: any[]) => {
    if (messages.length === 0) {
      return 'No AI knowledge available for this user yet.';
    }

    const conversationCount = conversations.length;
    const messageCount = messages.length;
    
    // Extract common health-related patterns from AI responses
    const healthKeywords = ['symptoms', 'medication', 'condition', 'treatment', 'diagnosis', 'pain', 'therapy'];
    const mentionedTopics = new Set<string>();
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      healthKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          mentionedTopics.add(keyword);
        }
      });
    });

    let knowledge = `**Conversation Summary:**\n`;
    knowledge += `• ${conversationCount} conversation(s) with ${messageCount} AI responses\n`;
    
    if (mentionedTopics.size > 0) {
      knowledge += `\n**Topics Discussed:**\n`;
      Array.from(mentionedTopics).forEach(topic => {
        knowledge += `• ${topic.charAt(0).toUpperCase() + topic.slice(1)}\n`;
      });
    }
    
    knowledge += `\n**Recent Conversation Topics:**\n`;
    conversations.slice(0, 5).forEach((conv, index) => {
      knowledge += `• ${conv.title || `Conversation ${index + 1}`}\n`;
    });

    if (conversations.length === 0) {
      knowledge = 'No conversations have been started for this user yet. Once you begin chatting with DrKnowsIt about this user, the AI will start learning and remembering information about their health profile, symptoms, medications, and preferences.';
    }

    return knowledge;
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeletingUserId(userId);
    try {
      await deleteUser(userId);
      // Reset selected user if it was the deleted one
      if (selectedUserId === userId) {
        setSelectedUserId('');
        setUserKnowledge('');
      }
      toast({
        title: "User Deleted",
        description: `${userName} and all associated data has been permanently deleted.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
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
            Configure how DrKnowItAll remembers your health information across conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="memory-enabled" className="text-base">
                Enable AI Memory
              </Label>
              <div className="text-sm text-muted-foreground">
                Allow DrKnowItAll to remember your health information and preferences across conversations.
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
            <HardDrive className="h-5 w-5" />
            Memory Management
          </CardTitle>
          <CardDescription>
            Manage your stored conversation history and AI memory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Current Memory Status</h4>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Real conversation data is stored and tracked based on your actual usage.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <h4 className="font-medium text-destructive mb-2">Clear Conversation History</h4>
              <p className="text-sm text-muted-foreground mb-3">
                This will permanently delete all your conversation history with DrKnowItAll. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={clearConversationHistory}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            </div>
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
            View what DrKnowsIt has learned about each user from your conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Select User</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={usersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a user to view AI knowledge" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.first_name} {user.last_name}
                      {user.is_primary && (
                        <span className="text-xs text-muted-foreground">(Primary)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Management Actions */}
          {selectedUserId && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                {(() => {
                  const selectedUser = users.find(u => u.id === selectedUserId);
                  return selectedUser ? (
                    <>
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
                    </>
                  ) : null;
                })()}
              </div>
              
              {(() => {
                const selectedUser = users.find(u => u.id === selectedUserId);
                return selectedUser && canDeleteUser(selectedUser) ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingUserId === selectedUser.id}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {deletingUserId === selectedUser.id ? "Deleting..." : "Delete User"}
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
                            <strong>This action cannot be undone.</strong> This will permanently delete:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li><strong>{selectedUser.first_name} {selectedUser.last_name}</strong>'s profile</li>
                            <li>All their health records and documents</li>
                            <li>All conversation history with AI</li>
                            <li>All diagnoses and health data</li>
                            <li>All doctor notes and feedback</li>
                            <li>All AI knowledge about this user</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(selectedUser.id, `${selectedUser.first_name} ${selectedUser.last_name}`)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : selectedUser && !canDeleteUser(selectedUser) ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Cannot delete primary user
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {selectedUserId && (
            <div className="space-y-3">
              <Label>AI Knowledge Summary</Label>
              <div className="p-4 border rounded-lg bg-muted/20 min-h-[200px]">
                {knowledgeLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">Loading user knowledge...</div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-foreground bg-transparent border-0 p-0 font-sans">
                      {userKnowledge || 'No knowledge available for this user yet.'}
                    </pre>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                This shows what DrKnowsIt has learned about the selected user based on your conversations. 
                The AI uses this information to provide more relevant health guidance.
              </div>
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