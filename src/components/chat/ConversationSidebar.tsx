// Updated ConversationSidebar component with better empty state handling
// File: src/components/ConversationSidebar.tsx

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/optimized/useConversationsQuery";
import { format } from "date-fns";
import { useState } from "react";
import { ConfirmDeleteConversationDialog } from "@/components/modals/ConfirmDeleteConversationDialog";

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversation: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string, confirmed: boolean) => void;
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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; conversationId: string | null; title: string }>({
    open: false,
    conversationId: null,
    title: ''
  });

  const handleDeleteClick = (conversationId: string, title: string) => {
    setDeleteDialog({
      open: true,
      conversationId,
      title
    });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.conversationId) {
      onDeleteConversation(deleteDialog.conversationId, true);
      setDeleteDialog({ open: false, conversationId: null, title: '' });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-80 h-full min-h-0 border-r border-border bg-card flex flex-col overflow-hidden">
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
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-3">
                No chat history yet
              </p>
              <p className="text-xs text-muted-foreground">
                Start a conversation to see it appear here
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="relative group mb-2">
                <Button
                  variant={currentConversation === conversation.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left p-3 pr-12 hover:bg-accent/50 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectConversation(conversation.id);
                  }}
                >
                  <div className="flex items-start space-x-3 w-full min-w-0 pointer-events-none">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteClick(conversation.id, conversation.title);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <ConfirmDeleteConversationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmDelete}
        conversationTitle={deleteDialog.title}
      />
    </div>
  );
};