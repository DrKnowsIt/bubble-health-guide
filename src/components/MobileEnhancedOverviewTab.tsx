import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Settings, 
  User, 
  Brain, 
  Shield, 
  FileText, 
  MessageSquare, 
  Calendar, 
  Upload, 
  ChevronDown, 
  ChevronRight,
  Activity,
  Crown,
  LogOut,
  Bell
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useHealthStats } from '@/hooks/useHealthStats';
import { useUsers } from '@/hooks/useUsers';
import { AISettings } from './AISettings';
import { FeatureDiscovery } from './FeatureDiscovery';
import { SubscriptionGate } from './SubscriptionGate';
import { PatientMemoryOverview } from './PatientMemoryOverview';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  is_primary: boolean;
  relationship: string;
  is_pet?: boolean;
}

interface MobileEnhancedOverviewTabProps {
  onTabChange?: (tab: string) => void;
  selectedUser?: User | null;
}

export const MobileEnhancedOverviewTab = ({ onTabChange, selectedUser }: MobileEnhancedOverviewTabProps) => {
  const { user, signOut } = useAuth();
  const { subscribed, subscription_tier, createCheckoutSession, openCustomerPortal } = useSubscription();
  const { totalRecords, totalConversations, lastActivityTime, loading } = useHealthStats(selectedUser);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const formatLastActivity = (timestamp: string | null) => {
    if (!timestamp) return "No activity";
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return "Just now";
  };

  const handleUpgrade = async () => {
    try {
      await createCheckoutSession('pro');
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error('Error opening customer portal:', error);
    }
  };

  return (
    <SubscriptionGate requiredTier="basic" feature="Overview Dashboard" description="View your health analytics, quick actions, and settings with a Basic or Pro subscription.">
      <div className="h-full overflow-y-auto p-4 space-y-6">
        {/* Subscription Status */}
        <Card className={cn(
          "border-2 transition-all",
          subscribed 
            ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30" 
            : "bg-gradient-to-br from-muted/10 to-muted/5 border-border"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className={cn("h-5 w-5", subscribed ? "text-primary" : "text-muted-foreground")} />
                Subscription Status
              </CardTitle>
              <Badge variant={subscribed ? "default" : "outline"}>
                {subscription_tier ? subscription_tier.toUpperCase() : 'FREE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscribed ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You're subscribed to the {subscription_tier} plan
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleManageSubscription}
                    className="flex-1"
                  >
                    Manage Subscription
                  </Button>
                  {subscription_tier === 'basic' && (
                    <Button 
                      size="sm" 
                      onClick={handleUpgrade}
                      className="flex-1"
                    >
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Subscribe to unlock all features and get the most out of DrKnowsIt
                </p>
                <Button 
                  onClick={handleUpgrade}
                  className="w-full"
                >
                  Get Started with Pro
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Health Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{loading ? "..." : totalRecords}</div>
              <p className="text-xs text-muted-foreground">Health Records</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-6 w-6 text-secondary mx-auto mb-2" />
              <div className="text-2xl font-bold">{loading ? "..." : totalConversations}</div>
              <p className="text-xs text-muted-foreground">AI Conversations</p>
            </CardContent>
          </Card>
        </div>

        {/* Last Activity */}
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Last Activity</p>
              <p className="text-2xl font-bold">{loading ? "..." : formatLastActivity(lastActivityTime)}</p>
              <p className="text-xs text-muted-foreground">ago</p>
            </div>
            <Calendar className="h-8 w-8 text-accent" />
          </CardContent>
        </Card>

        {/* Patient Memory Overview */}
        <PatientMemoryOverview 
          patientId={selectedUser?.id} 
          patientName={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : undefined}
          conversationId={null}
        />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Jump to common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-auto p-4 justify-start bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:bg-primary/20" 
              onClick={() => onTabChange?.('health')}
            >
              <Upload className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">Upload Records</div>
                <div className="text-sm text-muted-foreground">Add health documents</div>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>

            <Button 
              variant="outline" 
              className="w-full h-auto p-4 justify-start bg-gradient-to-r from-secondary/5 to-secondary/10 border-secondary/20 hover:bg-secondary/20" 
              onClick={() => onTabChange?.('health')}
            >
              <Calendar className="h-5 w-5 mr-3 text-secondary" />
              <div className="text-left">
                <div className="font-medium">Health Forms</div>
                <div className="text-sm text-muted-foreground">Complete structured forms</div>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>

            <Button 
              variant="outline" 
              className="w-full h-auto p-4 justify-start bg-gradient-to-r from-accent/5 to-accent/10 border-accent/20 hover:bg-accent/20" 
              onClick={() => onTabChange?.('chat')}
            >
              <MessageSquare className="h-5 w-5 mr-3 text-accent" />
              <div className="text-left">
                <div className="font-medium">Chat with AI</div>
                <div className="text-sm text-muted-foreground">Ask health questions</div>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Expandable Settings */}
        <Card>
          <Collapsible open={settingsExpanded} onOpenChange={setSettingsExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Settings & Preferences
                  </CardTitle>
                  <ChevronDown 
                    className={cn("h-4 w-4 transition-transform", settingsExpanded && "rotate-180")} 
                  />
                </div>
                <CardDescription>
                  Customize your DrKnowsIt experience
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                {/* AI Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Preferences
                  </h4>
                  <AISettings selectedUser={selectedUser || undefined} />
                </div>

                {/* Account Settings Sheet */}
                <Sheet open={showAccountSettings} onOpenChange={setShowAccountSettings}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Account Settings
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[400px]">
                    <SheetHeader>
                      <SheetTitle>Account Settings</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Profile Information</h4>
                        <div className="text-sm text-muted-foreground">
                          <p>Email: {user?.email}</p>
                          <p>Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          <Shield className="h-4 w-4 mr-2" />
                          Privacy & Security
                        </Button>
                        
                        <Button variant="outline" className="w-full justify-start">
                          <Bell className="h-4 w-4 mr-2" />
                          Notifications
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-destructive hover:text-destructive"
                          onClick={signOut}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Feature Discovery */}
        <FeatureDiscovery />
      </div>
    </SubscriptionGate>
  );
};