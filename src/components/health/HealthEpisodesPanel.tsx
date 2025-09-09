import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Clock, Stethoscope, CheckCircle, AlertCircle } from 'lucide-react';
import { useHealthEpisodes, type HealthEpisode } from '@/hooks/useHealthEpisodes';
import { CreateEpisodeDialog } from './CreateEpisodeDialog';
import { DoctorConfirmationDialog } from './DoctorConfirmationDialog';
import { format } from 'date-fns';

interface HealthEpisodesPanelProps {
  selectedPatientId?: string;
  onEpisodeSelect: (episode: HealthEpisode) => void;
}

export const HealthEpisodesPanel = ({ selectedPatientId, onEpisodeSelect }: HealthEpisodesPanelProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [selectedEpisodeForConfirmation, setSelectedEpisodeForConfirmation] = useState<HealthEpisode | null>(null);
  
  const {
    episodes,
    activeEpisode,
    loading,
    createEpisode,
    completeEpisode
  } = useHealthEpisodes(selectedPatientId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 'doctor_reviewed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Reviewed</Badge>;
      case 'archived':
        return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const icons = {
      symptoms: <AlertCircle className="w-3 h-3 mr-1" />,
      followup: <Stethoscope className="w-3 h-3 mr-1" />,
      routine_check: <Calendar className="w-3 h-3 mr-1" />,
      emergency: <AlertCircle className="w-3 h-3 mr-1" />
    };

    const colors = {
      symptoms: 'bg-yellow-100 text-yellow-800',
      followup: 'bg-blue-100 text-blue-800',
      routine_check: 'bg-green-100 text-green-800',
      emergency: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="secondary" className={colors[type as keyof typeof colors] || ''}>
        {icons[type as keyof typeof icons]}
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const handleEpisodeClick = (episode: HealthEpisode) => {
    onEpisodeSelect(episode);
  };

  const handleCompleteEpisode = async (episode: HealthEpisode) => {
    setSelectedEpisodeForConfirmation(episode);
    setShowConfirmationDialog(true);
  };

  const handleConfirmationSubmit = async (confirmationData: any) => {
    if (selectedEpisodeForConfirmation) {
      await completeEpisode(selectedEpisodeForConfirmation.id);
      setShowConfirmationDialog(false);
      setSelectedEpisodeForConfirmation(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Health Episodes</h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Health Episodes</h3>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Episode
        </Button>
      </div>

      <div className="space-y-3">
        {episodes.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No health episodes yet.</p>
              <p className="text-xs mt-1">Start a new episode to track your health concerns.</p>
            </div>
          </Card>
        ) : (
          episodes.map((episode) => (
            <Card 
              key={episode.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeEpisode?.id === episode.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleEpisodeClick(episode)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium">
                    {episode.episode_title}
                  </CardTitle>
                  <div className="flex gap-1">
                    {getStatusBadge(episode.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  {getTypeBadge(episode.episode_type)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(episode.start_date), 'MMM d, yyyy')}
                  </span>
                </div>
                
                {episode.episode_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {episode.episode_description}
                  </p>
                )}

                {episode.status === 'active' && (
                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteEpisode(episode);
                      }}
                      className="w-full text-xs"
                    >
                      Complete Episode
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateEpisodeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateEpisode={createEpisode}
      />

      <DoctorConfirmationDialog
        open={showConfirmationDialog}
        onOpenChange={setShowConfirmationDialog}
        episode={selectedEpisodeForConfirmation}
        onConfirm={handleConfirmationSubmit}
      />
    </div>
  );
};