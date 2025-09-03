import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Bug, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AnalysisDebugPanelProps {
  conversationId: string | null;
  patientId: string | null;
  className?: string;
}

export const AnalysisDebugPanel: React.FC<AnalysisDebugPanelProps> = ({
  conversationId,
  patientId,
  className
}) => {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [memory, setMemory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Real-time subscriptions to track changes
  useEffect(() => {
    if (!conversationId || !patientId) return;

    console.log('[AnalysisDebug] Setting up subscriptions for debugging');

    // Track diagnosis changes
    const diagnosisChannel = supabase
      .channel('debug-diagnosis')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_diagnoses',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[AnalysisDebug] Diagnosis change detected:', payload);
          refreshData();
        }
      )
      .subscribe();

    // Track solution changes
    const solutionChannel = supabase
      .channel('debug-solutions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_solutions',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[AnalysisDebug] Solution change detected:', payload);
          refreshData();
        }
      )
      .subscribe();

    // Track memory changes
    const memoryChannel = supabase
      .channel('debug-memory')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_memory',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[AnalysisDebug] Memory change detected:', payload);
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(diagnosisChannel);
      supabase.removeChannel(solutionChannel);
      supabase.removeChannel(memoryChannel);
    };
  }, [conversationId, patientId]);

  const refreshData = async () => {
    if (!conversationId || !patientId) {
      setDiagnoses([]);
      setSolutions([]);
      setMemory([]);
      return;
    }

    setLoading(true);
    console.log('[AnalysisDebug] Refreshing data for:', { conversationId, patientId });

    try {
      // Fetch diagnoses
      const { data: diagnosesData, error: diagnosesError } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (diagnosesError) throw diagnosesError;
      
      // Fetch solutions
      const { data: solutionsData, error: solutionsError } = await supabase
        .from('conversation_solutions')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (solutionsError) throw solutionsError;

      // Fetch memory
      const { data: memoryData, error: memoryError } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (memoryError) throw memoryError;

      setDiagnoses(diagnosesData || []);
      setSolutions(solutionsData || []);
      setMemory(memoryData || []);
      setLastRefresh(new Date());

      console.log('[AnalysisDebug] Data refreshed:', {
        diagnoses: diagnosesData?.length || 0,
        solutions: solutionsData?.length || 0,
        memory: memoryData?.length || 0
      });

    } catch (error) {
      console.error('[AnalysisDebug] Error refreshing data:', error);
      toast({
        title: 'Debug Error',
        description: 'Failed to refresh analysis data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [conversationId, patientId]);

  const clearAllData = async () => {
    if (!conversationId || !patientId) return;
    
    try {
      console.log('[AnalysisDebug] Clearing all analysis data');
      
      await Promise.allSettled([
        supabase
          .from('conversation_diagnoses')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('patient_id', patientId),
        
        supabase
          .from('conversation_solutions')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('patient_id', patientId),
        
        supabase
          .from('conversation_memory')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('patient_id', patientId)
      ]);

      await refreshData();
      toast({
        title: 'Data Cleared',
        description: 'All analysis data has been cleared for this conversation'
      });
    } catch (error) {
      console.error('[AnalysisDebug] Error clearing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear analysis data',
        variant: 'destructive'
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!conversationId || !patientId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Analysis Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a conversation to view analysis debug information
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Analysis Debug
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllData}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="diagnoses" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diagnoses" className="text-xs">
              Topics ({diagnoses.length})
            </TabsTrigger>
            <TabsTrigger value="solutions" className="text-xs">
              Solutions ({solutions.length})
            </TabsTrigger>
            <TabsTrigger value="memory" className="text-xs">
              Memory ({memory.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="diagnoses" className="m-0">
            <ScrollArea className="h-64 p-4">
              {diagnoses.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No diagnoses found
                </div>
              ) : (
                <div className="space-y-2">
                  {diagnoses.map((diagnosis, index) => (
                    <div key={diagnosis.id} className="p-2 border rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={getConfidenceColor(diagnosis.confidence || 0)}>
                          {Math.round((diagnosis.confidence || 0) * 100)}%
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(diagnosis.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-medium">{diagnosis.diagnosis}</div>
                      {diagnosis.reasoning && (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {diagnosis.reasoning.slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="solutions" className="m-0">
            <ScrollArea className="h-64 p-4">
              {solutions.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No solutions found
                </div>
              ) : (
                <div className="space-y-2">
                  {solutions.map((solution, index) => (
                    <div key={solution.id} className="p-2 border rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">{solution.category}</Badge>
                        <span className="text-muted-foreground">
                          {new Date(solution.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-medium">{solution.solution}</div>
                      {solution.confidence && (
                        <Badge className={`mt-1 ${getConfidenceColor(solution.confidence)}`}>
                          {Math.round(solution.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="memory" className="m-0">
            <ScrollArea className="h-64 p-4">
              {memory.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No memory records found
                </div>
              ) : (
                <div className="space-y-2">
                  {memory.map((memoryItem, index) => (
                    <div key={memoryItem.id} className="p-2 border rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary">Memory</Badge>
                        <span className="text-muted-foreground">
                          {new Date(memoryItem.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {memoryItem.summary && (
                        <div className="font-medium mb-1">{memoryItem.summary}</div>
                      )}
                      <div className="text-muted-foreground">
                        Keys: {Object.keys(memoryItem.memory || {}).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};