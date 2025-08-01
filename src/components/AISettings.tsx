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
import { usePatients } from '@/hooks/usePatients';
import { Brain, HardDrive, Settings, Trash2, User, Users } from 'lucide-react';

interface AISettingsData {
  memory_enabled: boolean;
}

export const AISettings = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const { patients, loading: patientsLoading } = usePatients();
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientKnowledge, setPatientKnowledge] = useState<string>('');
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [settings, setSettings] = useState<AISettingsData>({
    memory_enabled: true
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientKnowledge();
    }
  }, [selectedPatientId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          memory_enabled: data.memory_enabled
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load AI settings.",
      });
    }
  };

  const updateSettings = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('ai_settings')
        .upsert({
          user_id: user?.id,
          memory_enabled: settings.memory_enabled
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI settings updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update AI settings.",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const loadPatientKnowledge = async () => {
    if (!selectedPatientId || !user) return;
    
    setKnowledgeLoading(true);
    try {
      // Get conversations for this patient
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('patient_id', selectedPatientId)
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
        const knowledge = analyzePatientKnowledge(messages || [], conversations);
        setPatientKnowledge(knowledge);
      } else {
        setPatientKnowledge('No conversations found for this patient yet.');
      }
    } catch (error: any) {
      console.error('Error loading patient knowledge:', error);
      setPatientKnowledge('Error loading patient knowledge.');
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const analyzePatientKnowledge = (messages: any[], conversations: any[]) => {
    if (messages.length === 0) {
      return 'No AI knowledge available for this patient yet.';
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
      knowledge = 'No conversations have been started for this patient yet. Once you begin chatting with DrKnowsIt about this patient, the AI will start learning and remembering information about their health profile, symptoms, medications, and preferences.';
    }

    return knowledge;
  };

  const resetToDefaults = () => {
    setSettings({
      memory_enabled: true
    });
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
              checked={settings.memory_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, memory_enabled: checked })
              }
            />
          </div>


          <div className="flex gap-2">
            <Button onClick={updateSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
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
            Patient Knowledge
          </CardTitle>
          <CardDescription>
            View what DrKnowsIt has learned about each patient from your conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Select Patient</Label>
            <Select
              value={selectedPatientId}
              onValueChange={setSelectedPatientId}
              disabled={patientsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient to view AI knowledge" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {patient.first_name} {patient.last_name}
                      {patient.is_primary && (
                        <span className="text-xs text-muted-foreground">(Primary)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPatientId && (
            <div className="space-y-3">
              <Label>AI Knowledge Summary</Label>
              <div className="p-4 border rounded-lg bg-muted/20 min-h-[200px]">
                {knowledgeLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">Loading patient knowledge...</div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-foreground bg-transparent border-0 p-0 font-sans">
                      {patientKnowledge || 'No knowledge available for this patient yet.'}
                    </pre>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                This shows what DrKnowsIt has learned about the selected patient based on your conversations. 
                The AI uses this information to provide more relevant health guidance.
              </div>
            </div>
          )}

          {patients.length === 0 && !patientsLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-sm">No patients added yet.</div>
              <div className="text-xs">Add patients to start tracking AI knowledge.</div>
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
            Fine-tune DrKnowItAll's behavior and response preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Use Conservative Responses</Label>
                <div className="text-sm text-muted-foreground">
                  Prioritize safety over specificity in medical advice.
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Learning Mode</Label>
                <div className="text-sm text-muted-foreground">
                  Allow DrKnowItAll to learn from your feedback and preferences.
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Advanced settings are automatically optimized for the best experience. Changes may affect response quality.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};