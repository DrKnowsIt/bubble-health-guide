import { useState, useEffect } from 'react';
import { useHealthEpisodes, type HealthEpisode } from '@/hooks/useHealthEpisodes';
import { ChatInterfaceWithPatients } from '@/components/chat/ChatInterfaceWithPatients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface EpisodeBasedChatInterfaceProps {
  selectedPatient: any;
  onPatientChange: (patient: any) => void;
}

export const EpisodeBasedChatInterface = ({ selectedPatient, onPatientChange }: EpisodeBasedChatInterfaceProps) => {
  const { activeEpisode, setActiveEpisode } = useHealthEpisodes(selectedPatient?.id);
  const [showEpisodeSelection, setShowEpisodeSelection] = useState(!activeEpisode);

  useEffect(() => {
    setShowEpisodeSelection(!activeEpisode);
  }, [activeEpisode]);

  const handleEpisodeSelect = (episode: HealthEpisode) => {
    setActiveEpisode(episode);
    setShowEpisodeSelection(false);
  };

  const handleBackToEpisodes = () => {
    setActiveEpisode(null);
    setShowEpisodeSelection(true);
  };

  if (showEpisodeSelection) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Select a Health Episode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please select a health episode from the sidebar to start chatting, or create a new episode to discuss current health concerns.
          </p>
          <div className="text-center p-8">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No episode selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {activeEpisode && (
        <div className="border-b border-border p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEpisodes}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Episodes
              </Button>
              <div className="h-4 w-px bg-border" />
              <div>
                <h3 className="font-medium">{activeEpisode.episode_title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {activeEpisode.episode_type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(activeEpisode.start_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 min-h-0">
        <ChatInterfaceWithPatients 
          selectedUser={selectedPatient}
        />
      </div>
    </div>
  );
};