import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateEpisodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEpisode: (episodeData: any) => Promise<any>;
}

export const CreateEpisodeDialog = ({ open, onOpenChange, onCreateEpisode }: CreateEpisodeDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [episodeType, setEpisodeType] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !episodeType) return;

    try {
      setLoading(true);
      await onCreateEpisode({
        episode_title: title.trim(),
        episode_description: description.trim() || null,
        episode_type: episodeType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        status: 'active'
      });

      // Reset form
      setTitle('');
      setDescription('');
      setEpisodeType('');
      setStartDate(new Date());
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating episode:', error);
    } finally {
      setLoading(false);
    }
  };

  const episodeTypeOptions = [
    { value: 'symptoms', label: 'New Symptoms', description: 'New or worsening symptoms you want to discuss' },
    { value: 'followup', label: 'Follow-up', description: 'Following up on a previous condition or treatment' },
    { value: 'routine_check', label: 'Routine Check', description: 'Regular health monitoring or wellness check' },
    { value: 'emergency', label: 'Emergency', description: 'Urgent health concern that needs immediate attention' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Health Episode</DialogTitle>
          <DialogDescription>
            Create a new episode to track a specific health concern or event.
            Each episode will have its own conversation history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Episode Title</Label>
            <Input
              id="title"
              placeholder="e.g., Persistent headaches, Knee injury, Annual checkup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Episode Type</Label>
            <Select value={episodeType} onValueChange={setEpisodeType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select episode type" />
              </SelectTrigger>
              <SelectContent>
                {episodeTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of what you're experiencing..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !episodeType}>
              {loading ? 'Creating...' : 'Start Episode'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};