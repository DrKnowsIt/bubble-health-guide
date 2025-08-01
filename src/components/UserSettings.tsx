import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Shield, CreditCard, Bell, Settings, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export const UserSettings = () => {
  const { user, signOut } = useAuth();
  const { subscribed, openCustomerPortal } = useSubscription();
  const [activeTab, setActiveTab] = useState("profile");

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
              Subscribe to unlock advanced settings and premium features
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

      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" disabled={!subscribed}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="subscription" disabled={!subscribed}>
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="privacy" disabled={!subscribed}>
              <Shield className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="notifications" disabled={!subscribed}>
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className={!subscribed ? 'opacity-60 pointer-events-none' : ''}>
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input 
                      id="name" 
                      value={user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'} 
                      disabled={!subscribed}
                    />
                  </div>
                </div>
                <Separator />
                <Button disabled={!subscribed}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className={!subscribed ? 'opacity-60 pointer-events-none' : ''}>
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Current Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {subscribed ? 'Pro Plan' : 'No active subscription'}
                    </p>
                  </div>
                  {subscribed && (
                    <Button 
                      variant="outline" 
                      onClick={() => openCustomerPortal()}
                      disabled={!subscribed}
                    >
                      Manage Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className={!subscribed ? 'opacity-60 pointer-events-none' : ''}>
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Sharing</Label>
                    <div className="text-sm text-muted-foreground">
                      Control how your data is shared
                    </div>
                  </div>
                  <Switch disabled={!subscribed} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics</Label>
                    <div className="text-sm text-muted-foreground">
                      Help improve our service
                    </div>
                  </div>
                  <Switch disabled={!subscribed} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className={!subscribed ? 'opacity-60 pointer-events-none' : ''}>
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive updates via email
                    </div>
                  </div>
                  <Switch disabled={!subscribed} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Health Reminders</Label>
                    <div className="text-sm text-muted-foreground">
                      Get reminders for health checkups
                    </div>
                  </div>
                  <Switch disabled={!subscribed} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sign Out Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Sign Out</h3>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account
                </p>
              </div>
              <Button variant="destructive" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};