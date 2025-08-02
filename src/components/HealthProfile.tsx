import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, User, Calendar, Activity, Lock, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { UserSelector } from "@/components/UserSelector";
import { HealthRecords } from "@/components/HealthRecords";
import { HealthForms } from "@/components/HealthForms";
import { useNavigate } from "react-router-dom";

export const HealthProfile = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Subscription Alert - Only show for AI-related features */}
      {!subscribed && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-warning mb-2">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Subscribe to unlock health records storage, patient management, and AI health features
            </span>
          </div>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => navigate('/pricing')}
            className="h-6 px-2 text-xs"
          >
            View Plans
          </Button>
        </div>
      )}

      {/* Patient Selector */}
      <div className={!subscribed ? 'opacity-50 pointer-events-none' : ''}>
        <UserSelector />
      </div>

      {/* Health Profile Tabs */}
      <div className={!subscribed ? 'opacity-60' : ''}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="overview" disabled={!subscribed} className="flex-col gap-1 py-2 px-1 min-h-[3rem]">
              <User className="h-4 w-4" />
              <span className="mobile-text-xs sm:text-sm">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="records" disabled={!subscribed} className="flex-col gap-1 py-2 px-1 min-h-[3rem]">
              <FileText className="h-4 w-4" />
              <span className="mobile-text-xs sm:text-sm">Records</span>
            </TabsTrigger>
            <TabsTrigger value="forms" disabled={!subscribed} className="flex-col gap-1 py-2 px-1 min-h-[3rem]">
              <Calendar className="h-4 w-4" />
              <span className="mobile-text-xs sm:text-sm">Forms</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={!subscribed} className="flex-col gap-1 py-2 px-1 min-h-[3rem]">
              <Activity className="h-4 w-4" />
              <span className="mobile-text-xs sm:text-sm">Analytics</span>
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