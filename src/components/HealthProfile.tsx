import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, User, Calendar, Activity, Lock, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PatientSelector } from "@/components/PatientSelector";
import { HealthRecords } from "@/components/HealthRecords";
import { HealthForms } from "@/components/HealthForms";

export const HealthProfile = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const [activeTab, setActiveTab] = useState("overview");

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Subscription Alert */}
      {!subscribed && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-warning mb-2">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Subscribe to unlock health records storage and patient management
            </span>
          </div>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => window.location.href = '/pricing'}
            className="h-6 px-2 text-xs"
          >
            View Plans
          </Button>
        </div>
      )}

      {/* Patient Selector */}
      <div className={!subscribed ? 'opacity-50 pointer-events-none' : ''}>
        <PatientSelector />
      </div>

      {/* Health Profile Tabs */}
      <div className={!subscribed ? 'opacity-60' : ''}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" disabled={!subscribed}>
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="records" disabled={!subscribed}>
              <FileText className="h-4 w-4 mr-2" />
              Health Records
            </TabsTrigger>
            <TabsTrigger value="forms" disabled={!subscribed}>
              <Calendar className="h-4 w-4 mr-2" />
              Health Forms
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={!subscribed}>
              <Activity className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Health Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Quick Stats</div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">12</div>
                      <div className="text-sm text-muted-foreground">Health Records</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Recent Activity</div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">3</div>
                      <div className="text-sm text-muted-foreground">Records This Month</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <HealthRecords />
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <HealthForms />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Health Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Health Analytics Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Track your health trends and get insights from your data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};