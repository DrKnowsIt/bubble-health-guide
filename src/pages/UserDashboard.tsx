import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsers } from '@/hooks/useUsers';
import { useHealthStats } from '@/hooks/useHealthStats';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, FileText, MessageSquare, Brain, Activity, Calendar, Upload, Plus, Lock, Crown, Heart, User, LogOut } from 'lucide-react';
import { ChatGPTInterface } from '@/components/ChatGPTInterface';
import { HealthRecords } from '@/components/HealthRecords';
import { HealthForms } from '@/components/HealthForms';
import { AISettings } from '@/components/AISettings';
import { ContextualUserSelector } from '@/components/ContextualPatientSelector';
import { UserDropdown } from '@/components/UserDropdown';
import { UserManagement } from '@/components/UserManagement';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { PlanSelectionCard } from '@/components/PlanSelectionCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FeatureDiscovery } from '@/components/FeatureDiscovery';
import { MobileEnhancedChatInterface } from '@/components/MobileEnhancedChatInterface';
import { MobileEnhancedHealthTab } from '@/components/MobileEnhancedHealthTab';
import { MobileEnhancedOverviewTab } from '@/components/MobileEnhancedOverviewTab';
import { TabletChatInterface } from '@/components/TabletChatInterface';
import { cn } from '@/lib/utils';

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const { subscribed, subscription_tier, createCheckoutSession } = useSubscription();
  const { users, selectedUser, setSelectedUser } = useUsers();
  const [activeTab, setActiveTab] = useState('chat');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { totalRecords, totalConversations, lastActivityTime, loading } = useHealthStats();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
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

  // Tab configuration with subscription requirements
  const tabConfig = {
    chat: {
      requiredTier: 'basic',
      icon: MessageSquare,
      title: "AI Chat"
    },
    health: {
      requiredTier: 'basic',
      icon: Heart,
      title: "Health"
    },
    overview: {
      requiredTier: 'basic',
      icon: Activity,
      title: "Overview"
    }
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
            // Mobile: Simplified 3-tab bottom navigation
            <div className="order-2 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 mt-auto">
              <TabsList className="w-full grid grid-cols-3 h-16 bg-muted/50">
                <TabsTrigger value="chat" className={cn("flex flex-col items-center justify-center gap-1 py-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <MessageSquare className="h-5 w-5" />
                    {!hasAccess('basic') && <Lock className="h-3 w-3 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs font-medium">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="health" className={cn("flex flex-col items-center justify-center gap-1 py-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <Heart className="h-5 w-5" />
                    {!hasAccess('basic') && <Lock className="h-3 w-3 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs font-medium">Health</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className={cn("flex flex-col items-center justify-center gap-1 py-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <Activity className="h-5 w-5" />
                    {!hasAccess('basic') && <Lock className="h-3 w-3 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs font-medium">Overview</span>
                </TabsTrigger>
              </TabsList>
            </div>
          ) : isTablet ? (
            // Tablet: Enhanced bottom navigation with larger touch targets
            <div className="order-2 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 mt-auto">
              <TabsList className="w-full grid grid-cols-3 h-20 bg-muted/50">
                <TabsTrigger value="chat" className={cn("flex flex-col items-center justify-center gap-2 py-4 relative data-[state=active]:bg-background data-[state=active]:shadow-sm", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <MessageSquare className="h-6 w-6" />
                    {!hasAccess('basic') && <Lock className="h-4 w-4 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-sm font-medium">AI Chat</span>
                </TabsTrigger>
                <TabsTrigger value="health" className={cn("flex flex-col items-center justify-center gap-2 py-4 relative data-[state=active]:bg-background data-[state=active]:shadow-sm", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <Heart className="h-6 w-6" />
                    {!hasAccess('basic') && <Lock className="h-4 w-4 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-sm font-medium">Health</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className={cn("flex flex-col items-center justify-center gap-2 py-4 relative data-[state=active]:bg-background data-[state=active]:shadow-sm", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <Activity className="h-6 w-6" />
                    {!hasAccess('basic') && <Lock className="h-4 w-4 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-sm font-medium">Overview</span>
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            // Desktop: Top navigation - FIXED THIS SECTION
            <div className="px-4 pt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chat" className={cn("flex items-center gap-2 relative", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <MessageSquare className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="health" className={cn("flex items-center gap-2 relative", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <Heart className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Health
                </TabsTrigger>
                <TabsTrigger value="overview" className={cn("flex items-center gap-2 relative", !hasAccess('basic') && "opacity-50")}>
                  <div className="relative">
                    <Activity className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Overview
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Tab Content */}
          <div className={cn("flex-1 overflow-hidden", isMobile ? "order-1" : isTablet ? "order-1 p-4" : "px-4 pb-6")}>
            <TabsContent value="chat" className="h-full mt-0 pt-4">
              {isMobile ? (
                <MobileEnhancedChatInterface selectedUser={selectedUser} onUserSelect={setSelectedUser} />
              ) : isTablet ? (
                <TabletChatInterface selectedUser={selectedUser} onUserSelect={setSelectedUser} />
              ) : (
                <SubscriptionGate requiredTier="basic" feature="AI Chat" description="...">
                  <div className="grid grid-cols-[320px_1fr_320px] gap-6 h-full min-h-[calc(100vh-160px)]">
                    
                    {/* Column 1: Chat History */}
                    <div className="bg-card border rounded-lg h-full">
                      <ConversationHistory
                        selectedPatientId={selectedUser?.id}
                        onConversationSelect={selectConversation}
                        onNewConversation={handleNewConversation}
                        activeConversationId={currentConversation}
                      />
                    </div>
                
                    {/* Column 2: Main Chat Interface */}
                    <div className="bg-card border rounded-lg h-full flex flex-col">
                      <ChatInterfaceWithHistory />
                    </div>
                
                    {/* Column 3: Probable Diagnoses */}
                    <div className="bg-card border rounded-lg h-full">
                      {selectedUser && diagnoses.length > 0 ? (
                        <ProbableDiagnoses
                          diagnoses={diagnoses.map(d => ({
                            diagnosis: d.diagnosis,
                            confidence: d.confidence,
                            reasoning: d.reasoning,
                            updated_at: d.updated_at
                          }))}
                          patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                          patientId={selectedUser.id}
                        />
                      ) : (
                        <div className="p-6 text-center text-muted-foreground">
                          <p className="font-semibold">Probable Diagnoses</p>
                          <p className="text-sm mt-2">
                            {selectedUser ? "No diagnoses generated for this conversation yet. They will appear here as you chat with the AI." : "Select a patient to see potential diagnoses."}
                          </p>
                        </div>
                      )}
                    </div>
                
                  </div>
                </SubscriptionGate>
              )}
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0 pt-4">
              {isMobile ? (
                <MobileEnhancedHealthTab onTabChange={setActiveTab} />
              ) : (
                <SubscriptionGate requiredTier="basic" feature="Health Records" description="Manage your health records and forms with a Basic or Pro subscription.">
                  <div className="space-y-6">
                    <ContextualUserSelector 
                      users={users} 
                      selectedUser={selectedUser} 
                      onUserSelect={setSelectedUser} 
                      hasAccess={hasAccess('basic')} 
                      title="Health Records" 
                      description="Select a user to manage health records" 
                    />
                    
                    <Tabs defaultValue="records" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="records">Health Records</TabsTrigger>
                        <TabsTrigger value="forms">Health Forms</TabsTrigger>
                      </TabsList>
                      <TabsContent value="records" className="mt-4">
                        <HealthRecords />
                      </TabsContent>
                      <TabsContent value="forms" className="mt-4">
                        <HealthForms />
                      </TabsContent>
                    </Tabs>
                  </div>
                </SubscriptionGate>
              )}
            </TabsContent>

            <TabsContent value="overview" className="h-full mt-0 pt-4">
              {isMobile ? (
                <MobileEnhancedOverviewTab onTabChange={setActiveTab} />
              ) : (
                <div className="h-full overflow-y-auto">
                  <SubscriptionGate requiredTier="basic" feature="Overview" description="View your health analytics, quick actions, and settings with a Basic or Pro subscription.">
                    <div className="space-y-6">
                      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>
                              Common tasks to help you get the most out of DrKnowsIt
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-4">
                            <Button variant="outline" className="h-auto p-4 flex-col items-start" onClick={() => setActiveTab('health')}>
                              <Calendar className="h-5 w-5 mb-2" />
                              <span className="font-medium">Complete Health Forms</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Fill out structured forms for comprehensive health data
                              </span>
                            </Button>

                            <Button variant="outline" className="h-auto p-4 flex-col items-start" onClick={() => setActiveTab('health')}>
                              <Upload className="h-5 w-5 mb-2" />
                              <span className="font-medium">Upload Health Records</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Add medical history, lab results, or other health documents
                              </span>
                            </Button>

                            <Button variant="outline" className="h-auto p-4 flex-col items-start" onClick={() => setActiveTab('chat')}>
                              <MessageSquare className="h-5 w-5 mb-2" />
                              <span className="font-medium">Start AI Chat</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Ask questions and get personalized health insights
                              </span>
                            </Button>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Brain className="h-5 w-5" />
                              AI Settings
                            </CardTitle>
                            <CardDescription>
                              Customize AI behavior and preferences
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <AISettings />
                          </CardContent>
                        </Card>
                      </div>

                      {/* Feature Discovery */}
                      <FeatureDiscovery onNavigateToTab={setActiveTab} />
                    </div>
                  </SubscriptionGate>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}