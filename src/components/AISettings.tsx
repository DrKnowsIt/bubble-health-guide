import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, HardDrive, Settings, Trash2 } from 'lucide-react';

interface AISettingsData {
  memory_enabled: boolean;
  conversation_history_limit: number;
  personalization_level: 'low' | 'medium' | 'high';
}

export const AISettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AISettingsData>({
    memory_enabled: true,
    conversation_history_limit: 50,
    personalization_level: 'medium'
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

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
          memory_enabled: data.memory_enabled,
          conversation_history_limit: data.conversation_history_limit,
          personalization_level: data.personalization_level as 'low' | 'medium' | 'high'
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
          memory_enabled: settings.memory_enabled,
          conversation_history_limit: settings.conversation_history_limit,
          personalization_level: settings.personalization_level
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

  const resetToDefaults = () => {
    setSettings({
      memory_enabled: true,
      conversation_history_limit: 50,
      personalization_level: 'medium'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Memory & Personalization
          </CardTitle>
          <CardDescription>
            Configure how DrKnowItAll remembers and personalizes your interactions.
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

          <div className="space-y-3">
            <Label>Personalization Level</Label>
            <Select
              value={settings.personalization_level}
              onValueChange={(value) =>
                setSettings({ ...settings, personalization_level: value as 'low' | 'medium' | 'high' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="space-y-1">
                    <div className="font-medium">Low</div>
                    <div className="text-xs text-muted-foreground">Basic personalization</div>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="space-y-1">
                    <div className="font-medium">Medium</div>
                    <div className="text-xs text-muted-foreground">Balanced personalization</div>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="space-y-1">
                    <div className="font-medium">High</div>
                    <div className="text-xs text-muted-foreground">Deep personalization</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Higher levels provide more personalized responses based on your health profile and preferences.
            </div>
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