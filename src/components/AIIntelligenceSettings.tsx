import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Brain, FileText, AlertCircle, TrendingUp, Lock } from 'lucide-react';
import { useStrategicReferencing } from '@/hooks/useStrategicReferencing';
import { useUsers } from '@/hooks/useUsers';
import { useSubscription } from '@/hooks/useSubscription';

export const AIIntelligenceSettings = () => {
  const { selectedUser } = useUsers();
  const { subscribed, subscription_tier, openCustomerPortal } = useSubscription();
  const { 
    priorities, 
    doctorNotes, 
    summaries, 
    loading, 
    getStrategicContext,
    updateDoctorNote 
  } = useStrategicReferencing(selectedUser?.id);

  const [activeTab, setActiveTab] = useState("overview");

  const isPro = subscription_tier === 'pro';
  const isBasic = subscription_tier === 'basic';
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Intelligence Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading AI settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const strategicContext = getStrategicContext();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Intelligence Settings
          </CardTitle>
          <CardDescription>
            Configure how the AI processes and prioritizes your health data for more personalized responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!subscribed && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center mb-6">
              <div className="flex items-center justify-center gap-2 text-warning mb-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  AI Intelligence features require a subscription
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => openCustomerPortal()} className="h-6 px-2 text-xs">
                Subscribe Now
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="priorities">Data Priorities</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="summaries">Record Summaries</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Data Priorities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{priorities.length}</div>
                    <p className="text-xs text-muted-foreground">Configured priorities</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{doctorNotes.length}</div>
                    <p className="text-xs text-muted-foreground">Active doctor notes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Summaries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaries.length}</div>
                    <p className="text-xs text-muted-foreground">Health record summaries</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Current AI Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Subscription Tier:</span>
                      <Badge variant={isPro ? "default" : isBasic ? "secondary" : "outline"}>
                        {strategicContext.subscription_tier}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Always Referenced:</span>
                      <span>{strategicContext.always_reference.summaries.length} summaries</span>
                    </div>
                    {strategicContext.conditional_reference && (
                      <div className="flex justify-between">
                        <span>Conditional Reference:</span>
                        <span>{strategicContext.conditional_reference.summaries.length} summaries</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Total Records:</span>
                      <span>{strategicContext.total_records}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="priorities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Health Data Priorities</CardTitle>
                  <CardDescription>
                    Configure which health data types are prioritized for AI analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!subscribed ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-sm">Subscription required</div>
                      <div className="text-xs">Upgrade to configure AI data priorities</div>
                    </div>
                  ) : priorities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-sm">No priorities configured yet</div>
                      <div className="text-xs">Priorities will be set automatically based on your usage</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {priorities.map((priority) => (
                        <div key={priority.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium capitalize">{priority.data_type.replace('_', ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              Priority: {priority.priority_level}
                            </div>
                          </div>
                          <Badge variant={
                            priority.priority_level === 'always' ? 'default' :
                            priority.priority_level === 'conditional' ? 'secondary' : 'outline'
                          }>
                            {priority.priority_level}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">AI Doctor Notes</CardTitle>
                  <CardDescription>
                    Review insights and patterns identified by the AI during your conversations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!subscribed ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-sm">Subscription required</div>
                      <div className="text-xs">Upgrade to view AI-generated insights</div>
                    </div>
                  ) : doctorNotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-sm">No AI insights yet</div>
                      <div className="text-xs">Continue chatting to generate AI insights</div>
                    </div>
                  ) : (
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {doctorNotes.map((note) => (
                          <Card key={note.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">{note.title}</CardTitle>
                                <div className="flex items-center gap-2">
                                  <Badge variant={
                                    note.note_type === 'concern' ? 'destructive' :
                                    note.note_type === 'pattern' ? 'default' :
                                    note.note_type === 'preference' ? 'secondary' : 'outline'
                                  }>
                                    {note.note_type}
                                  </Badge>
                                  {note.confidence_score && (
                                    <Badge variant="outline">
                                      {Math.round(note.confidence_score * 100)}% confidence
                                    </Badge>
                                  )}
                                  <Switch
                                    checked={note.is_active}
                                    onCheckedChange={(checked) => 
                                      updateDoctorNote(note.id, { is_active: checked })
                                    }
                                  />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{note.content}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summaries" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Health Record Summaries</CardTitle>
                  <CardDescription>
                    AI-generated summaries of your health records for context.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!subscribed ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-sm">Subscription required</div>
                      <div className="text-xs">Upgrade to view health record summaries</div>
                    </div>
                  ) : summaries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-sm">No record summaries yet</div>
                      <div className="text-xs">Add health records to generate summaries</div>
                    </div>
                  ) : (
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {summaries.map((summary) => (
                          <Card key={summary.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">
                                  {summary.health_record?.title || 'Health Record'}
                                </CardTitle>
                                <Badge variant={
                                  summary.priority_level === 'always' ? 'default' :
                                  summary.priority_level === 'conditional' ? 'secondary' : 'outline'
                                }>
                                  {summary.priority_level}
                                </Badge>
                              </div>
                              <CardDescription className="text-xs">
                                {summary.health_record?.record_type} • {
                                  summary.health_record?.created_at ? 
                                  new Date(summary.health_record.created_at).toLocaleDateString() : 
                                  'No date'
                                }
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{summary.summary_text}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};