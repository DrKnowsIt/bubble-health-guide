import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Calendar, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
}

interface ConversationHistoryProps {
  selectedPatientId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  activeConversationId?: string;
}

export const ConversationHistory = ({ 
  selectedPatientId, 
  onConversationSelect, 
  onNewConversation,
  activeConversationId 
}: ConversationHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (selectedPatientId && user?.id) {
      loadConversations();
    } else {
      setConversations([]);
    }
  }, [selectedPatientId, user?.id]);

  const loadConversations = async () => {
    if (!selectedPatientId || !user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('patient_id', selectedPatientId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!selectedPatientId) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 text-center">
          <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Select a patient to view chat history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat History
          </CardTitle>
          <Button
            onClick={onNewConversation}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                No chat history yet
              </p>
              <Button
                onClick={onNewConversation}
                size="sm"
                variant="outline"
              >
                Start First Chat
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="relative group">
                  <Button
                    variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                    onClick={() => onConversationSelect(conversation.id)}
                    className="w-full justify-start h-auto p-3 text-left pr-12"
                  >
                    <div className="flex flex-col items-start space-y-1 w-full">
                      <span className="font-medium text-sm truncate w-full">
                        {conversation.title}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(conversation.updated_at)}</span>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteConversation(conversation.id, e)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};