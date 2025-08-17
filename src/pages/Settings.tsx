import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Shield, CreditCard, Bell, Settings as SettingsIcon, Lock, AlertTriangle, Trash2, ArrowLeft, Code } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useAlphaTester } from "@/hooks/useAlphaTester";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    subscribed,
    subscription_tier,
    openCustomerPortal,
    refreshSubscription
  } = useSubscription();
  const {
    isAlphaTester,
    activateTesterMode,
    toggleTesterMode
  } = useAlphaTester();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [testerCode, setTesterCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [tierLoading, setTierLoading] = useState(false);
  if (!user) {
    return <div>Loading...</div>;
  }
  const handleDeleteAccount = async () => {
    try {
      const {
        error
      } = await supabase.functions.invoke('delete-account');
      if (error) throw error;

      // Sign out after successful deletion
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };
  const handleActivateTesterMode = async () => {
    if (!testerCode.trim()) return;
    
    setCodeLoading(true);
    const success = await activateTesterMode(testerCode);
    if (success) {
      setTesterCode("");
    }
    setCodeLoading(false);
  };

  const handleToggleTesterMode = async (enabled: boolean) => {
    await toggleTesterMode(enabled);
  };

  const handleTierSwitch = async () => {
    if (!selectedTier || !user?.email) return;

    setTierLoading(true);
    try {
      const tierConfig = {
        unpaid: { subscribed: false, tier: null, end: null },
        basic: { 
          subscribed: true, 
          tier: 'basic',
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        },
        pro: { 
          subscribed: true, 
          tier: 'pro',
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        }
      };

      const config = tierConfig[selectedTier as keyof typeof tierConfig];
      
      // Call secure edge function to update subscription status
      const { data, error } = await supabase.functions.invoke('alpha-tier-switch', {
        body: { 
          email: user.email,
          subscribed: config.subscribed,
          subscription_tier: config.tier,
          subscription_end: config.end
        }
      });

      if (error) {
        throw new Error(error.message || 'Request failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Refresh subscription status
      await refreshSubscription();
      
      toast({
        title: "Tier switched successfully",
        description: `Switched to ${selectedTier} tier`,
      });
    } catch (error) {
      console.error('Error switching tier:', error);
      const message = (error as any)?.message || 'Failed to switch subscription tier';
      toast({
        title: "Error switching tier",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTierLoading(false);
    }
  };

  const getCurrentTierDisplay = () => {
    if (!subscribed) return 'Unpaid';
    return subscription_tier || 'Unknown';
  };

  const getTierDisplay = () => {
    if (!subscribed || !subscription_tier) return {
      text: 'Free Plan',
      variant: 'secondary' as const
    };
    if (subscription_tier === 'pro') return {
      text: 'Pro Plan',
      variant: 'default' as const
    };
    if (subscription_tier === 'basic') return {
      text: 'Basic Plan',
      variant: 'outline' as const
    };
    return {
      text: 'Free Plan',
      variant: 'secondary' as const
    };
  };
  const tierInfo = getTierDisplay();
  return <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header Section */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences and settings</p>
            </div>
          </div>

          {/* Only show subscription alert for subscription-related features */}
          {!subscribed && activeTab === "subscription" && <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center mb-6">
              <div className="flex items-center justify-center gap-2 text-warning mb-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Subscribe to manage your subscription and access premium features
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => openCustomerPortal()} className="h-6 px-2 text-xs">
                Subscribe Now
              </Button>
            </div>}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" value={user.email || ''} readOnly />
                      <p className="text-xs text-muted-foreground">Your email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input id="name" value={user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'} placeholder="Enter your display name" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" value={user.user_metadata?.first_name || ''} placeholder="Enter your first name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={user.user_metadata?.last_name || ''} placeholder="Enter your last name" />
                    </div>
                  </div>

                  <Separator />
                  <div className="flex justify-end">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tester Access Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Tester Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base font-medium">Current Status</Label>
                        <div className="text-sm text-muted-foreground">
                          {isAlphaTester ? "Alpha tester mode is active" : "Alpha tester mode is inactive"}
                        </div>
                      </div>
                      <Badge variant={isAlphaTester ? "default" : "secondary"}>
                        {isAlphaTester ? "Active Tester" : "Not a Tester"}
                      </Badge>
                    </div>

                    {!isAlphaTester ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="testerCode">Enter Tester Code</Label>
                          <div className="flex gap-2">
                            <Input
                              id="testerCode"
                              type="password"
                              placeholder="Enter your tester activation code"
                              value={testerCode}
                              onChange={(e) => setTesterCode(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleActivateTesterMode()}
                            />
                            <Button 
                              onClick={handleActivateTesterMode}
                              disabled={!testerCode.trim() || codeLoading}
                            >
                              {codeLoading ? "Activating..." : "Activate"}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Contact the administrator to get your tester activation code
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label className="text-base font-medium">Tester Mode</Label>
                            <div className="text-sm text-muted-foreground">
                              Enable or disable alpha testing features
                            </div>
                          </div>
                          <Switch 
                            checked={isAlphaTester} 
                            onCheckedChange={handleToggleTesterMode}
                          />
                        </div>

                        <Separator />

                        {/* Tier Switching Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium">Subscription Testing</Label>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              Alpha
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Current Tier</Label>
                              <div className="text-sm text-muted-foreground">
                                Current subscription status for testing
                              </div>
                            </div>
                            <Badge variant="outline" className="font-medium">
                              {getCurrentTierDisplay()}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Switch to Tier</Label>
                            <Select value={selectedTier} onValueChange={setSelectedTier}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a tier to switch to" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="basic">Basic</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button 
                            onClick={handleTierSwitch} 
                            disabled={!selectedTier || tierLoading}
                            className="w-full"
                          >
                            {tierLoading ? 'Switching...' : 'Switch Tier'}
                          </Button>
                        </div>

                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Tester privileges:</strong> Access to subscription tier switching, 
                            early feature previews, and testing tools. Use tier switching to test 
                            different subscription features.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Current Plan</h3>
                        <p className="text-sm text-muted-foreground">
                          {subscribed ? `Active ${tierInfo.text}` : 'No active subscription'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={tierInfo.variant}>
                      {tierInfo.text}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => openCustomerPortal()} className="h-auto p-4 flex flex-col items-start gap-2">
                        <span className="font-medium">{subscribed ? 'Manage Subscription' : 'Subscribe Now'}</span>
                        <span className="text-xs text-muted-foreground">{subscribed ? 'Update billing, cancel, or change plan' : 'Unlock premium features'}</span>
                      </Button>
                    
                    <Button variant="outline" onClick={() => openCustomerPortal()} className="h-auto p-4 flex flex-col items-start gap-2">
                      <span className="font-medium">View All Plans</span>
                      <span className="text-xs text-muted-foreground">Compare features and pricing</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Analytics & Usage Data</Label>
                      <div className="text-sm text-muted-foreground">
                        Help us improve our service by sharing anonymous usage data
                      </div>
                    </div>
                    <Switch />
                  </div>

                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Data Export</Label>
                      <div className="text-sm text-muted-foreground">
                        Download all your data in a portable format
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Export Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Email Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Receive important updates and reminders via email
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Health Reminders</Label>
                      <div className="text-sm text-muted-foreground">
                        Get notifications for health checkups and medication reminders
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />
                  

                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Security Alerts</Label>
                      <div className="text-sm text-muted-foreground">
                        Get notified about account security events and login attempts
                      </div>
                    </div>
                    <Switch defaultChecked disabled />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Account Management Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Account Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Sign Out</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div>
                  <h3 className="font-medium text-destructive">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delete Account Confirmation Dialog */}
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Account
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete your account? This action cannot be undone. 
                  All your data, including health records, conversations, and settings will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount} className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>;
};
export default Settings;