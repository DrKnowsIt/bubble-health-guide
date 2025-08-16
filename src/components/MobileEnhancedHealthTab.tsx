import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { FileText, Calendar, Activity, Upload, Users, TrendingUp, ChevronRight, Plus } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useSubscription } from '@/hooks/useSubscription';
import { HealthRecords } from './HealthRecords';
import { HealthForms } from './HealthForms';
import { HealthRecordHistoryTab } from './HealthRecordHistoryTab';
import { UserDropdown } from './UserDropdown';
import { SubscriptionGate } from './SubscriptionGate';
import { cn } from '@/lib/utils';

interface MobileEnhancedHealthTabProps {
  onTabChange?: (tab: string) => void;
}

export const MobileEnhancedHealthTab = ({ onTabChange }: MobileEnhancedHealthTabProps) => {
  const { users, selectedUser, setSelectedUser } = useUsers();
  const { subscribed, subscription_tier } = useSubscription();
  const [activeHealthTab, setActiveHealthTab] = useState('overview');
  const [showPatientSelector, setShowPatientSelector] = useState(false);

  const hasAccess = (requiredTier: string) => {
    if (!subscribed || !subscription_tier) return false;
    if (requiredTier === 'basic') {
      return subscription_tier === 'basic' || subscription_tier === 'pro';
    }
    if (requiredTier === 'pro') {
      return subscription_tier === 'pro';
    }
    return false;
  };

  return (
    <SubscriptionGate requiredTier="basic" feature="Health Management" description="Store and manage your health records and forms with a Basic or Pro subscription.">
      <div className="h-full min-h-0 flex flex-col bg-background">
        {/* Patient Selection Header */}
        <div className="p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Health Management</h2>
              <p className="text-sm text-muted-foreground">Manage records and forms</p>
            </div>
            
            <Sheet open={showPatientSelector} onOpenChange={setShowPatientSelector}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {selectedUser ? selectedUser.first_name : 'Select Patient'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[300px]">
                <SheetHeader>
                  <SheetTitle>Select Patient</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <UserDropdown
                    users={users}
                    selectedUser={selectedUser}
                    onUserSelect={(user) => {
                      setSelectedUser(user);
                      setShowPatientSelector(false);
                    }}
                    open={false}
                    onOpenChange={() => {}}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Health Overview Cards */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Records</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-secondary mx-auto mb-2" />
                <div className="text-xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Forms</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Nested Health Tabs */}
        <div className="flex-1 min-h-0 px-4 pb-4">
          <Tabs value={activeHealthTab} onValueChange={setActiveHealthTab} className="h-full min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="records" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Records</span>
              </TabsTrigger>
              <TabsTrigger value="forms" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Forms</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Health Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">12</div>
                        <div className="text-sm text-muted-foreground">Total Records</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-secondary">3</div>
                        <div className="text-sm text-muted-foreground">Completed Forms</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-auto p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20"
                        onClick={() => setActiveHealthTab('records')}
                      >
                        <Upload className="h-5 w-5 mr-3 text-primary" />
                        <div className="text-left">
                          <div className="font-medium">Upload New Records</div>
                          <div className="text-sm text-muted-foreground">Add medical documents</div>
                        </div>
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>

                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-auto p-4 bg-gradient-to-r from-secondary/5 to-secondary/10 border-secondary/20"
                        onClick={() => setActiveHealthTab('forms')}
                      >
                        <Calendar className="h-5 w-5 mr-3 text-secondary" />
                        <div className="text-left">
                          <div className="font-medium">Complete Health Forms</div>
                          <div className="text-sm text-muted-foreground">Fill structured forms</div>
                        </div>
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="h-2 w-2 bg-primary rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Blood Test Results Uploaded</div>
                          <div className="text-xs text-muted-foreground">2 hours ago</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="h-2 w-2 bg-secondary rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Medical History Form Completed</div>
                          <div className="text-xs text-muted-foreground">1 day ago</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="records" className="mt-0 h-full">
                <div className="h-full">
                  <HealthRecords selectedPatient={selectedUser} />
                </div>
              </TabsContent>

              <TabsContent value="forms" className="mt-0 h-full">
                <div className="h-full">
                  <HealthForms 
                    selectedPatient={selectedUser} 
                    onFormSubmit={() => {
                      // Refresh the overview when form is submitted
                      setActiveHealthTab('overview');
                    }} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 h-full">
                <div className="h-full">
                  <HealthRecordHistoryTab patientId={selectedUser?.id} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </SubscriptionGate>
  );
};