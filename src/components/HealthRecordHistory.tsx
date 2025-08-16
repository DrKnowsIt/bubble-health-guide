import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import { formatDistanceToNow } from 'date-fns';

interface HealthRecordHistoryEntry {
  id: string;
  health_record_id: string;
  change_type: string;
  previous_data?: any;
  new_data?: any;
  changed_fields?: string[];
  change_reason?: string;
  created_at: string;
  patient_id?: string;
}

interface HealthRecordHistoryProps {
  recordId?: string;
  patientId?: string;
  maxEntries?: number;
}

export const HealthRecordHistory = ({ recordId, patientId, maxEntries = 10 }: HealthRecordHistoryProps) => {
  const { user } = useAuth();
  const { patients } = usePatients();
  const [history, setHistory] = useState<HealthRecordHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHistory();
  }, [recordId, patientId, user?.id]);

  const fetchHistory = async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('health_record_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(maxEntries);

      if (recordId) {
        query = query.eq('health_record_id', recordId);
      }

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching health record history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const getPatientName = (patientId?: string) => {
    if (!patientId) return 'Personal Record';
    const patient = patients?.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecordTitle = (entry: HealthRecordHistoryEntry) => {
    const data = entry.new_data || entry.previous_data;
    return data?.title || 'Health Record';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No changes recorded yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Change History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {history.map((entry) => {
          const isExpanded = expandedEntries.has(entry.id);
          
          return (
            <div key={entry.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={getChangeTypeColor(entry.change_type)}>
                    {entry.change_type.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{getRecordTitle(entry)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(entry.id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {getPatientName(entry.patient_id)}
                </div>
              </div>

              {entry.change_reason && (
                <div className="text-sm">
                  <strong>Reason:</strong> {entry.change_reason}
                </div>
              )}

              {entry.changed_fields && entry.changed_fields.length > 0 && (
                <div className="text-sm">
                  <strong>Changed fields:</strong> {entry.changed_fields.join(', ')}
                </div>
              )}

              {isExpanded && (
                <div className="space-y-3 pt-3 border-t">
                  {entry.change_type === 'updated' && entry.previous_data && entry.new_data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Previous Data</h4>
                        <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(entry.previous_data.data || {}, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">New Data</h4>
                        <pre className="text-xs bg-green-50 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(entry.new_data.data || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {entry.change_type === 'created' && entry.new_data && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Created Data</h4>
                      <pre className="text-xs bg-green-50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(entry.new_data.data || {}, null, 2)}
                      </pre>
                    </div>
                  )}

                  {entry.change_type === 'deleted' && entry.previous_data && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Deleted Data</h4>
                      <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(entry.previous_data.data || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};