import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePatients } from '@/hooks/usePatients';
import { useHealthStats } from '@/hooks/useHealthStats';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  FileText, 
  MessageSquare, 
  Brain,
  Activity,
  Calendar,
  Upload,
  Plus,
  Lock,
  Crown,
  Heart,
  User,
  LogOut
} from 'lucide-react';
import { ChatInterfaceWithPatients } from '@/components/ChatInterfaceWithPatients';
import { UserSettings } from '@/components/UserSettings';
import { HealthRecords } from '@/components/HealthRecords';
import { HealthForms } from '@/components/HealthForms';
import { AISettings } from '@/components/AISettings';
import { ContextualPatientSelector } from '@/components/ContextualPatientSelector';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { PlanSelectionCard } from '@/components/PlanSelectionCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { cn } from '@/lib/utils';

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const { subscribed, subscription_tier, createCheckoutSession } = useSubscription();
  const { patients, selectedPatient, setSelectedPatient } = usePatients();
  const [activeTab, setActiveTab] = useState('chat');
  const { totalRecords, totalConversations, lastActivityTime, loading } = useHealthStats();
  const isMobile = useIsMobile();

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

  // Listen for navigation events from header
  useEffect(() => {
    const handleNavigateToSettings = () => {
      setActiveTab('settings');
    };

    window.addEventListener('navigateToSettings', handleNavigateToSettings);
    return () => window.removeEventListener('navigateToSettings', handleNavigateToSettings);
  }, []);

  // Tab configuration with subscription requirements
  const tabConfig = {
    chat: { requiredTier: 'basic', icon: MessageSquare, title: "AI Chat" },
    health: { requiredTier: 'basic', icon: Activity, title: "Health Records" },
    forms: { requiredTier: 'pro', icon: Calendar, title: "Health Forms" },
    'ai-settings': { requiredTier: 'basic', icon: Brain, title: "AI Settings" },
    overview: { requiredTier: 'basic', icon: FileText, title: "Overview" },
    settings: { requiredTier: null, icon: Settings, title: "Account" }
  };

  // Check if user has access to a specific tier
  const hasAccess = (requiredTier: string | null) => {
    if (!requiredTier) return true; // No subscription required
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
    <div className="min-h-screen bg-background">
      {/* Subscription Alert */}
      {!subscribed && (
        <div className="bg-primary/10 border-b border-primary/20 p-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Choose a plan to unlock features</span>
            </div>
            <a href="/pricing" className="text-sm text-primary hover:underline">
              View Plans
            </a>
          </div>
        </div>
      )}

      {/* Modern Dashboard Header */}
      <DashboardHeader />

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-[calc(100vh-80px)]">
          {/* Tab Navigation */}
          {isMobile ? (
            // Mobile: Simple bottom navigation
            <div className="order-2 border-t border-border bg-background p-2 mt-auto">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger 
                  value="chat" 
                  className={cn("flex flex-col items-center gap-1 py-2 relative", !hasAccess('basic') && "opacity-50")}
                >
                  <div className="relative">
                    <MessageSquare className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs">Chat</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className={cn("flex flex-col items-center gap-1 py-2 relative", !hasAccess('basic') && "opacity-50")}
                >
                  <div className="relative">
                    <Activity className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs">Records</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="overview" 
                  className={cn("flex flex-col items-center gap-1 py-2 relative", !hasAccess('basic') && "opacity-50")}
                >
                  <div className="relative">
                    <FileText className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col items-center gap-1 py-2">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs">More</span>
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            // Desktop: Top navigation
            <div className="px-4 pt-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger 
                  value="chat" 
                  className={cn("flex items-center gap-2 relative", !hasAccess('basic') && "opacity-50")}
                >
                  <div className="relative">
                    <MessageSquare className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  AI Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className={cn("flex items-center gap-2 relative", !hasAccess('basic') && "opacity-50")}
                >
                  <div className="relative">
                    <Activity className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Health Records
                </TabsTrigger>
                <TabsTrigger 
                  value="forms" 
                  className={cn("flex items-center gap-2 relative", !hasAccess('pro') && "opacity-50")}
                >
                  <div className="relative">
                    <Calendar className="h-4 w-4" />
                    {!hasAccess('pro') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Health Forms
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-settings" 
                  className={cn("flex items-center gap-2 relative", !hasAccess('basic') && "opacity-50")}
                >
                  <div className="relative">
                    <Brain className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  AI Settings
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger 
                  value="overview" 
                  className={cn("flex items-center gap-2 relative", !hasAccess('basic') && "opacity-50")}
                >
                  <div className="relative">
                    <FileText className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Overview
                </TabsTrigger>
              </TabsList>
            </div>
          )}

           {/* Tab Content */}
          <div className={cn("flex-1 overflow-hidden", isMobile ? "order-1" : "px-4 pb-6")}>
            <TabsContent value="chat" className="h-full mt-0 pt-4">
              <SubscriptionGate
                requiredTier="basic"
                feature="AI Chat"
                description="Start conversations with our AI health assistant using a Basic or Pro subscription."
              >
                <div className="space-y-4">
                  {/* Contextual Patient Selector */}
                  <ContextualPatientSelector
                    patients={patients}
                    selectedPatient={selectedPatient}
                    onPatientSelect={setSelectedPatient}
                    hasAccess={hasAccess('basic')}
                    title="Chat with AI"
                    description="Select a patient to have personalized conversations"
                  />
                  
                  {isMobile ? (
                    <div className="flex flex-col h-full">
                      <ChatInterfaceWithPatients isMobile={true} selectedPatient={selectedPatient} />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col min-h-[calc(100vh-280px)]">
                      <div className="mb-4 flex-shrink-0">
                        <h2 className="text-lg font-semibold">AI Health Assistant</h2>
                        <p className="text-sm text-muted-foreground">Chat with DrKnowsIt for personalized health guidance and medical insights.</p>
                      </div>
                      <div className="flex-1 min-h-0">
                        <ChatInterfaceWithPatients selectedPatient={selectedPatient} />
                      </div>
                    </div>
                  )}
                </div>
              </SubscriptionGate>
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0 pt-4">
              <div className={cn("h-full overflow-y-auto", isMobile ? "p-4" : "")}>
                <SubscriptionGate
                  requiredTier="basic"
                  feature="Health Records"
                  description="Store and manage your health records securely with a Basic or Pro subscription."
                >
                  <div className="space-y-4">
                    {/* Contextual Patient Selector */}
                    <ContextualPatientSelector
                      patients={patients}
                      selectedPatient={selectedPatient}
                      onPatientSelect={setSelectedPatient}
                      hasAccess={hasAccess('basic')}
                      title="Health Records"
                      description="Select a patient to view their health records"
                    />
                    
                    <HealthRecords selectedPatient={selectedPatient} />
                  </div>
                </SubscriptionGate>
              </div>
            </TabsContent>

            {!isMobile && (
              <TabsContent value="forms" className="h-full mt-0 pt-4">
                <div className="h-full overflow-y-auto">
                  <SubscriptionGate
                    requiredTier="pro"
                    feature="Health Forms"
                    description="Access structured health forms and comprehensive data entry with a Pro subscription."
                  >
                    <div className="space-y-4">
                      {/* Contextual Patient Selector */}
                      <ContextualPatientSelector
                        patients={patients}
                        selectedPatient={selectedPatient}
                        onPatientSelect={setSelectedPatient}
                        hasAccess={hasAccess('pro')}
                        title="Health Forms"
                        description="Select a patient to fill out their health forms"
                      />
                      
                      <HealthForms selectedPatient={selectedPatient} onFormSubmit={() => setActiveTab('health')} />
                    </div>
                  </SubscriptionGate>
                </div>
              </TabsContent>
            )}

            {!isMobile && (
              <TabsContent value="ai-settings" className="h-full mt-0 pt-4">
                <div className="h-full overflow-y-auto">
                  <SubscriptionGate
                    requiredTier="basic"
                    feature="AI Settings"
                    description="Customize AI behavior and personalization preferences with a Basic or Pro subscription."
                  >
                    <AISettings />
                  </SubscriptionGate>
                </div>
              </TabsContent>
            )}

            <TabsContent value="settings" className="h-full mt-0 pt-4">
              <div className={cn("h-full overflow-y-auto", isMobile ? "p-4" : "")}>
                {/* Mobile: Show additional navigation options */}
                {isMobile && (
                  <div className="space-y-4 mb-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Access</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab('health')}
                          className="flex flex-col items-center gap-2 h-16"
                        >
                          <Activity className="h-5 w-5" />
                          <span className="text-sm">Records</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab('overview')}
                          className="flex flex-col items-center gap-2 h-16"
                        >
                          <FileText className="h-5 w-5" />
                          <span className="text-sm">Overview</span>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <UserSettings />
              </div>
            </TabsContent>

            <TabsContent value="overview" className="h-full mt-0 pt-4">
              <div className={cn("h-full overflow-y-auto", isMobile ? "p-4" : "")}>
                <SubscriptionGate
                  requiredTier="basic"
                  feature="Overview"
                  description="View your health analytics and activity summary with a Basic or Pro subscription."
                >
                  <div className="space-y-6">
                    <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Health Records</CardTitle>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{loading ? "..." : totalRecords}</div>
                          <p className="text-xs text-muted-foreground">Total records uploaded</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">AI Conversations</CardTitle>
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{loading ? "..." : totalConversations}</div>
                          <p className="text-xs text-muted-foreground">Total conversations</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{loading ? "..." : formatLastActivity(lastActivityTime)}</div>
                          <p className="text-xs text-muted-foreground">Ago</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                          Common tasks to help you get the most out of DrKnowsIt
                        </CardDescription>
                      </CardHeader>
                      <CardContent className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3")}>
                        {!isMobile && (
                          <Button 
                            variant="outline" 
                            className="h-auto p-4 flex-col items-start"
                            onClick={() => setActiveTab('forms')}
                          >
                            <Calendar className="h-5 w-5 mb-2" />
                            <span className="font-medium">Complete Health Forms</span>
                            <span className="text-sm text-muted-foreground text-left">
                              Fill out structured forms for comprehensive health data
                            </span>
                          </Button>
                        )}

                        <Button 
                          variant="outline" 
                          className="h-auto p-4 flex-col items-start"
                          onClick={() => setActiveTab('health')}
                        >
                          <Upload className="h-5 w-5 mb-2" />
                          <span className="font-medium">Upload Health Records</span>
                          <span className="text-sm text-muted-foreground text-left">
                            Add medical history, lab results, or other health documents
                          </span>
                        </Button>

                        <Button 
                          variant="outline" 
                          className="h-auto p-4 flex-col items-start"
                          onClick={() => setActiveTab('chat')}
                        >
                          <Plus className="h-5 w-5 mb-2" />
                          <span className="font-medium">Start New Conversation</span>
                          <span className="text-sm text-muted-foreground text-left">
                            Ask DrKnowsIt about your health concerns
                          </span>
                        </Button>

                        {!isMobile && (
                          <>
                            <Button 
                              variant="outline" 
                              className="h-auto p-4 flex-col items-start"
                              onClick={() => setActiveTab('ai-settings')}
                            >
                              <Brain className="h-5 w-5 mb-2" />
                              <span className="font-medium">Customize AI</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Adjust memory and personalization settings
                              </span>
                            </Button>

                            <Button 
                              variant="outline" 
                              className="h-auto p-4 flex-col items-start"
                              onClick={() => setActiveTab('settings')}
                            >
                              <Settings className="h-5 w-5 mb-2" />
                              <span className="font-medium">Account Settings</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Update your profile and preferences
                              </span>
                            </Button>

                            <Button 
                              variant="outline" 
                              className="h-auto p-4 flex-col items-start"
                              onClick={() => setActiveTab('health')}
                            >
                              <Upload className="h-5 w-5 mb-2" />
                              <span className="font-medium">Upload DNA File</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Upload genetic data for personalized insights
                              </span>
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </SubscriptionGate>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}