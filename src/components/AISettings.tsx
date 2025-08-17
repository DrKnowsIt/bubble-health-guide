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
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { Brain, HardDrive, Settings, Trash2, User, Users, AlertTriangle, FileDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';
import { toast as sonnerToast } from 'sonner';

export const AISettings = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const { users, loading: usersLoading, deleteUser, canDeleteUser } = useUsers();
  const { settings, loading: aiSettingsLoading, updateSettings } = useAISettings();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [clearingMemory, setClearingMemory] = useState<string | null>(null);
  const [topDiagnosis, setTopDiagnosis] = useState<string>('');
  
  // Use the conversation memory hook for the selected user
  const { insights, loading: memoryLoading, getMemoryStats } = useConversationMemory(selectedUserId);

  // Format memory insights for display
  const formatMemoryKnowledge = () => {
    if (!insights || insights.length === 0) {
      return 'No memory insights available for this user yet.';
    }

    const stats = getMemoryStats();
    let knowledgeText = `Memory Insights: ${stats.totalInsights} total\n`;
    knowledgeText += `Categories: ${Object.keys(stats.categories).join(', ')}\n\n`;

    // Group insights by category
    const groupedInsights = insights.reduce((acc, insight) => {
      if (!acc[insight.category]) {
        acc[insight.category] = [];
      }
      acc[insight.category].push(insight);
      return acc;
    }, {} as Record<string, any[]>);

    // Display insights by category
    Object.entries(groupedInsights).forEach(([category, categoryInsights]) => {
      knowledgeText += `${category.toUpperCase()}:\n`;
      categoryInsights.slice(0, 3).forEach(insight => {
        const value = typeof insight.value === 'object' 
          ? JSON.stringify(insight.value) 
          : String(insight.value);
        knowledgeText += `• ${insight.key}: ${value}\n`;
      });
      knowledgeText += '\n';
    });

    if (stats.lastMemoryUpdate) {
      knowledgeText += `Last updated: ${stats.lastMemoryUpdate.toLocaleDateString()}`;
    }

    return knowledgeText;
  };

  // Fetch top diagnosis for selected user
  const fetchTopDiagnosis = async () => {
    if (!selectedUserId || !user) return;
    
    try {
      const { data: diagnoses, error } = await supabase
        .from('conversation_diagnoses')
        .select('diagnosis, confidence, created_at')
        .eq('user_id', user.id)
        .eq('patient_id', selectedUserId)
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (diagnoses && diagnoses.length > 0) {
        const topDx = diagnoses[0];
        setTopDiagnosis(`${topDx.diagnosis} (${Math.round((topDx.confidence || 0) * 100)}% confidence)`);
      } else {
        setTopDiagnosis('No diagnoses available yet');
      }
    } catch (error) {
      console.error('Error fetching top diagnosis:', error);
      setTopDiagnosis('Error loading diagnosis');
    }
  };

  // Export memory to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const selectedUser = users.find(u => u.id === selectedUserId);
    const userName = selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Unknown User';
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Official Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('DrKnowsIt', 20, 20);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('AI-Powered Health Assistant', 20, 28);
    doc.text('www.drknowsit.com', 20, 35);
    
    // Divider line
    doc.line(20, 40, 190, 40);
    
    // Report header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('User Memory Report', 20, 50);
    
    // User and date info
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`User: ${userName}`, 20, 60);
    doc.text(`Report Generated: ${currentDate}`, 20, 67);
    doc.text(`Generated by: DrKnowsIt AI Memory System`, 20, 74);
    
    // Another divider
    doc.line(20, 80, 190, 80);
    
    // Memory content
    doc.setFontSize(10);
    const memoryText = formatMemoryKnowledge();
    const splitText = doc.splitTextToSize(memoryText, 170);
    doc.text(splitText, 20, 90);
    
    // Top diagnosis at bottom
    if (topDiagnosis) {
      const yPosition = doc.internal.pageSize.height - 40;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Top Diagnosis:', 20, yPosition - 10);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(topDiagnosis, 20, yPosition);
    }
    
    // Footer
    const footerY = doc.internal.pageSize.height - 15;
    doc.setFontSize(8);
    doc.text('This report is generated by DrKnowsIt AI and should be reviewed by a healthcare professional.', 20, footerY);
    
    // Save the PDF
    doc.save(`DrKnowsIt_${userName.replace(/\s+/g, '_')}_Memory_Report_${currentDate.replace(/\s+/g, '_')}.pdf`);
    sonnerToast.success('Memory report exported to PDF');
  };

  // Update top diagnosis when user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchTopDiagnosis();
    } else {
      setTopDiagnosis('');
    }
  }, [selectedUserId]);


  const clearUserMemory = async (userId: string, userName: string) => {
    if (!user) return;
    
    setClearingMemory(userId);
    try {
      // Delete conversation memory for this specific user
      const { error: memoryError } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', userId);

      if (memoryError) throw memoryError;

      // Delete diagnoses for this specific user
      const { error: diagnosesError } = await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', userId);

      if (diagnosesError) throw diagnosesError;

      // Get conversations for this specific user
      const { data: userConversations, error: conversationsQueryError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('patient_id', userId);

      if (conversationsQueryError) throw conversationsQueryError;

      const conversationIds = userConversations?.map(c => c.id) || [];

      if (conversationIds.length > 0) {
        // Delete messages for this user's conversations
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        if (messagesError) throw messagesError;

        // Delete conversations for this specific user
        const { error: conversationsError } = await supabase
          .from('conversations')
          .delete()
          .eq('user_id', user.id)
          .eq('patient_id', userId);

        if (conversationsError) throw conversationsError;
      }

      toast({
        title: "Memory Cleared",
        description: `All memory and conversation data for ${userName} has been permanently deleted.`,
      });

      // Reset selected user and refresh
      setSelectedUserId('');
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear user memory. Please try again.",
      });
    } finally {
      setClearingMemory(null);
    }
  };


  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeletingUserId(userId);
    try {
      await deleteUser(userId);
      // Reset selected user if it was the deleted one
      if (selectedUserId === userId) {
        setSelectedUserId('');
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
              <div className="flex items-center justify-between">
                <Label>AI Knowledge Summary</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={exportToPDF}
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={memoryLoading || !insights?.length}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  {(() => {
                    const selectedUser = users.find(u => u.id === selectedUserId);
                    return selectedUser ? (
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
                                <strong>This action cannot be undone.</strong> This will permanently delete:
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>All conversation history with <strong>{selectedUser.first_name} {selectedUser.last_name}</strong></li>
                                <li>All AI memory and insights for this user</li>
                                <li>All diagnoses and analysis data</li>
                                <li>All chat messages and interactions</li>
                              </ul>
                              <p className="text-sm mt-3">
                                The user profile and health records will remain intact. Only conversation data and AI memory will be cleared.
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => clearUserMemory(selectedUser.id, `${selectedUser.first_name} ${selectedUser.last_name}`)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clear Memory
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-muted/20 min-h-[200px] max-h-[400px] overflow-y-auto">
                {memoryLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">Loading memory insights...</div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-foreground bg-transparent border-0 p-0 font-sans">
                      {formatMemoryKnowledge()}
                    </pre>
                    {topDiagnosis && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm font-medium text-foreground mb-2">Top Diagnosis:</div>
                        <div className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-md">
                          {topDiagnosis}
                        </div>
                      </div>
                    )}
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