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
import { CalendarIcon, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useHealthEpisodes, type HealthEpisode } from '@/hooks/useHealthEpisodes';

interface DoctorConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: HealthEpisode | null;
  onConfirm: (confirmationData: any) => Promise<void>;
}

export const DoctorConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  episode, 
  onConfirm 
}: DoctorConfirmationDialogProps) => {
  const [sawDoctor, setSawDoctor] = useState<boolean | null>(null);
  const [confirmationType, setConfirmationType] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState('');
  const [confirmationDate, setConfirmationDate] = useState<Date>(new Date());
  const [followupDate, setFollowupDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  const { createDoctorConfirmation, createMedicalHistoryEntry } = useHealthEpisodes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!episode) return;

    try {
      setLoading(true);

      if (sawDoctor && confirmationType && diagnosis) {
        // Create doctor confirmation
        const confirmation = await createDoctorConfirmation({
          health_episode_id: episode.id,
          confirmation_type: confirmationType,
          confirmed_diagnosis: diagnosis,
          doctor_notes: doctorNotes,
          confidence_level: confidenceLevel as any,
          confirmation_date: format(confirmationDate, 'yyyy-MM-dd'),
          next_followup_date: followupDate ? format(followupDate, 'yyyy-MM-dd') : undefined
        });

        // If it's a confirmed diagnosis, add to medical history
        if (confidenceLevel === 'confirmed' && confirmation) {
          await createMedicalHistoryEntry({
            condition_name: diagnosis,
            diagnosis_date: format(confirmationDate, 'yyyy-MM-dd'),
            doctor_confirmation_id: confirmation.id,
            status: 'active',
            notes: doctorNotes
          });
        }
      }

      await onConfirm({
        sawDoctor,
        confirmationType,
        diagnosis,
        doctorNotes,
        confidenceLevel,
        confirmationDate,
        followupDate
      });

      // Reset form
      setSawDoctor(null);
      setConfirmationType('');
      setDiagnosis('');
      setDoctorNotes('');
      setConfidenceLevel('');
      setConfirmationDate(new Date());
      setFollowupDate(undefined);
    } catch (error) {
      console.error('Error submitting confirmation:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmationTypes = [
    { value: 'diagnosis', label: 'Diagnosis' },
    { value: 'treatment', label: 'Treatment Plan' },
    { value: 'test_results', label: 'Test Results' },
    { value: 'followup_needed', label: 'Follow-up Required' }
  ];

  const confidenceLevels = [
    { value: 'confirmed', label: 'Confirmed Diagnosis' },
    { value: 'suspected', label: 'Suspected/Likely' },
    { value: 'ruled_out', label: 'Ruled Out' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Complete Episode: {episode?.episode_title}
          </DialogTitle>
          <DialogDescription>
            Let's record what happened with this health episode. This helps build your medical history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Did you see a doctor for this episode?</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={sawDoctor === true ? "default" : "outline"}
                  onClick={() => setSawDoctor(true)}
                  className="flex-1"
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={sawDoctor === false ? "default" : "outline"}
                  onClick={() => setSawDoctor(false)}
                  className="flex-1"
                >
                  No
                </Button>
              </div>
            </div>

            {sawDoctor === true && (
              <>
                <div className="space-y-2">
                  <Label>What did the doctor confirm?</Label>
                  <Select value={confirmationType} onValueChange={setConfirmationType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select confirmation type" />
                    </SelectTrigger>
                    <SelectContent>
                      {confirmationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis or Finding</Label>
                  <Input
                    id="diagnosis"
                    placeholder="e.g., Tension headache, Minor sprain, Normal results"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confidence Level</Label>
                  <Select value={confidenceLevel} onValueChange={setConfidenceLevel} required>
                    <SelectTrigger>
                      <SelectValue placeholder="How certain was the doctor?" />
                    </SelectTrigger>
                    <SelectContent>
                      {confidenceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Appointment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !confirmationDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {confirmationDate ? format(confirmationDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={confirmationDate}
                        onSelect={(date) => date && setConfirmationDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Doctor's Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes, treatment recommendations, etc."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Follow-up Appointment (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !followupDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {followupDate ? format(followupDate, 'PPP') : 'No follow-up scheduled'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={followupDate}
                        onSelect={setFollowupDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {sawDoctor === false && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No problem! The episode will be marked as complete. If you see a doctor later, 
                  you can always add that information to your medical history.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || sawDoctor === null || (sawDoctor && (!confirmationType || !diagnosis || !confidenceLevel))}
            >
              {loading ? 'Completing...' : 'Complete Episode'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};