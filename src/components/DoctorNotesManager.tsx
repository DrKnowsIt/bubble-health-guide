import React, { useState } from 'react';
import { useStrategicReferencing } from '@/hooks/useStrategicReferencing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Brain, TrendingUp, AlertTriangle, Heart, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DoctorNotesManagerProps {
  patientId?: string | null;
}

const noteTypeIcons = {
  pattern: TrendingUp,
  concern: AlertTriangle,
  preference: Heart,
  insight: Brain,
};

const noteTypeLabels = {
  pattern: 'Health Pattern',
  concern: 'Ongoing Concern',
  preference: 'User Preference',
  insight: 'Key Insight',
};

const noteTypeColors = {
  pattern: 'bg-blue-100 text-blue-800 border-blue-200',
  concern: 'bg-orange-100 text-orange-800 border-orange-200',
  preference: 'bg-purple-100 text-purple-800 border-purple-200',
  insight: 'bg-green-100 text-green-800 border-green-200',
};

export const DoctorNotesManager: React.FC<DoctorNotesManagerProps> = ({ patientId }) => {
  const { doctorNotes, loading, createDoctorNote, updateDoctorNote } = useStrategicReferencing(patientId);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    note_type: 'insight' as 'pattern' | 'concern' | 'preference' | 'insight',
    confidence_score: 0.8,
  });

  const handleCreateNote = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const noteData = {
      title: formData.title,
      content: formData.content,
      note_type: formData.note_type,
      confidence_score: formData.confidence_score,
      conversation_context: {},
      is_active: true,
      patient_id: patientId || null,
    };

    const result = await createDoctorNote(noteData);
    if (result) {
      toast.success('Doctor note created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        content: '',
        note_type: 'insight',
        confidence_score: 0.8,
      });
    } else {
      toast.error('Failed to create doctor note');
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    const result = await updateDoctorNote(editingNote.id, {
      title: formData.title,
      content: formData.content,
      note_type: formData.note_type,
      confidence_score: formData.confidence_score,
    });

    if (result) {
      toast.success('Doctor note updated successfully');
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        note_type: 'insight',
        confidence_score: 0.8,
      });
    } else {
      toast.error('Failed to update doctor note');
    }
  };

  const handleDeactivateNote = async (noteId: string) => {
    const result = await updateDoctorNote(noteId, { is_active: false });
    if (result) {
      toast.success('Doctor note deactivated');
    } else {
      toast.error('Failed to deactivate note');
    }
  };

  const openEditDialog = (note: any) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      note_type: note.note_type,
      confidence_score: note.confidence_score || 0.8,
    });
  };

  const groupedNotes = doctorNotes.reduce((acc, note) => {
    if (!acc[note.note_type]) acc[note.note_type] = [];
    acc[note.note_type].push(note);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Doctor Notes (AI Memory)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading notes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Doctor Notes (AI Memory)
            </CardTitle>
            <CardDescription>
              Persistent AI memory that tracks health patterns, concerns, and insights across conversations
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen || !!editingNote} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingNote(null);
              setFormData({
                title: '',
                content: '',
                note_type: 'insight',
                confidence_score: 0.8,
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingNote ? 'Edit Doctor Note' : 'Create Doctor Note'}
                </DialogTitle>
                <DialogDescription>
                  {editingNote 
                    ? 'Update this AI memory note'
                    : 'Create a new AI memory note for persistent context across conversations'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Note Type</label>
                  <Select
                    value={formData.note_type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, note_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(noteTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief descriptive title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Detailed note content that the AI should remember"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Confidence Score</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.confidence_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, confidence_score: parseFloat(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    0.0 = Low confidence, 1.0 = High confidence
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingNote(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={editingNote ? handleUpdateNote : handleCreateNote}>
                    {editingNote ? 'Update' : 'Create'} Note
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {doctorNotes.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No doctor notes yet</p>
            <p className="text-sm">Create notes to help the AI remember important health patterns and insights</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotes).map(([noteType, notes]) => {
              const IconComponent = noteTypeIcons[noteType as keyof typeof noteTypeIcons];
              return (
                <div key={noteType}>
                  <div className="flex items-center gap-2 mb-3">
                    <IconComponent className="h-4 w-4" />
                    <h3 className="font-medium">
                      {noteTypeLabels[noteType as keyof typeof noteTypeLabels]}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {notes.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 rounded-lg border ${noteTypeColors[noteType as keyof typeof noteTypeColors]}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">{note.title}</h4>
                            <p className="text-sm opacity-90">{note.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs opacity-75">
                              {note.confidence_score && (
                                <span>Confidence: {Math.round(note.confidence_score * 100)}%</span>
                              )}
                              <span>{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(note)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateNote(note.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};