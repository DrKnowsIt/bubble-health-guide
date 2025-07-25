import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useConversations";
import { format } from "date-fns";

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversation: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isAuthenticated: boolean;
}

export const ConversationSidebar = ({ 
  conversations, 
  currentConversation, 
  onSelectConversation, 
  onStartNewConversation,
  onDeleteConversation,
  isAuthenticated 
}: ConversationSidebarProps) => {
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-80 border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onStartNewConversation}
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>
      
      <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    currentConversation === conversation.id && "bg-muted"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(conversation.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};