import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsers } from '@/hooks/useUsers';
import { useHealthStats } from '@/hooks/useHealthStats';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, FileText, MessageSquare, Brain, Activity, Calendar, Upload, Plus, Lock, Crown, Heart, User, LogOut } from 'lucide-react';
import { ChatInterfaceWithUsers } from '@/components/ChatInterfaceWithPatients';
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
import { cn } from '@/lib/utils';

export default function UserDashboard() {
  const {
    user,
    signOut
  } = useAuth();
  const {
    subscribed,
    subscription_tier,
    createCheckoutSession
  } = useSubscription();
  const {
    users,
    selectedUser,
    setSelectedUser
  } = useUsers();
  const [activeTab, setActiveTab] = useState('chat');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    totalRecords,
    totalConversations,
    lastActivityTime,
    loading
  } = useHealthStats();
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
          ) : (
            // Desktop: Top navigation
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
          <div className={cn("flex-1 overflow-hidden", isMobile ? "order-1" : "px-4 pb-6")}>
            <TabsContent value="chat" className="h-full mt-0 pt-4">
              <SubscriptionGate requiredTier="basic" feature="AI Chat" description="Start conversations with our AI health assistant using a Basic or Pro subscription.">
                <div className="space-y-4">
                  {/* Contextual Patient Selector */}
                  <ContextualUserSelector users={users} selectedUser={selectedUser} onUserSelect={setSelectedUser} hasAccess={hasAccess('basic')} title="Chat with AI" description="Select a user to have personalized conversations" />
                  
                  {isMobile ? (
                    <div className="flex flex-col h-full">
                      <ChatInterfaceWithUsers isMobile={true} selectedUser={selectedUser} />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col min-h-[calc(100vh-280px)]">
                      <div className="mb-4 flex-shrink-0">
                        <h2 className="text-lg font-semibold">AI Health Assistant</h2>
                        <p className="text-sm text-muted-foreground">Chat with DrKnowsIt for personalized health guidance and medical insights.</p>
                      </div>
                      <div className="flex-1 min-h-0">
                        <ChatInterfaceWithUsers selectedUser={selectedUser} />
                      </div>
                    </div>
                  )}
                </div>
              </SubscriptionGate>
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0 pt-4">
              <div className={cn("h-full overflow-y-auto", isMobile ? "p-4" : "")}>
                <SubscriptionGate requiredTier="basic" feature="Health" description="Store and manage your health records and forms with a Basic or Pro subscription.">
                  {isMobile ? (
                    <Tabs defaultValue="records" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="records" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Records
                        </TabsTrigger>
                        <TabsTrigger value="forms" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Forms
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="records" className="mt-0">
                        <div className="space-y-4">
                          <div className="bg-background/50 p-4 rounded-lg border">
                            <h3 className="font-semibold mb-2">Health Records</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Select a user to view their health records
                            </p>
                            <UserDropdown
                              users={users}
                              selectedUser={selectedUser}
                              onUserSelect={setSelectedUser}
                              open={dropdownOpen}
                              onOpenChange={setDropdownOpen}
                            />
                          </div>
                          <HealthRecords selectedPatient={selectedUser} />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="forms" className="mt-0">
                        <div className="space-y-4">
                          <ContextualUserSelector 
                            users={users} 
                            selectedUser={selectedUser} 
                            onUserSelect={setSelectedUser} 
                            hasAccess={hasAccess('basic')} 
                            title="Health Forms" 
                            description="Select a user to fill out their health forms" 
                          />
                          <HealthForms selectedPatient={selectedUser} onFormSubmit={() => setActiveTab('health')} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Health Records</h3>
                          <p className="text-sm text-muted-foreground">Select a user to view their health records</p>
                          <div className="max-w-xs">
                            <UserDropdown
                              users={users}
                              selectedUser={selectedUser}
                              onUserSelect={setSelectedUser}
                              open={dropdownOpen}
                              onOpenChange={setDropdownOpen}
                            />
                          </div>
                        </div>
                        <HealthRecords selectedPatient={selectedUser} />
                      </div>
                      
                      <div className="space-y-4">
                        <ContextualUserSelector 
                          users={users} 
                          selectedUser={selectedUser} 
                          onUserSelect={setSelectedUser} 
                          hasAccess={hasAccess('basic')} 
                          title="Health Forms" 
                          description="Select a user to fill out their health forms" 
                        />
                        <HealthForms selectedPatient={selectedUser} onFormSubmit={() => setActiveTab('health')} />
                      </div>
                    </div>
                  )}
                </SubscriptionGate>
              </div>
            </TabsContent>

            <TabsContent value="overview" className="h-full mt-0 pt-4">
              <div className={cn("h-full overflow-y-auto", isMobile ? "p-4" : "")}>
                <SubscriptionGate requiredTier="basic" feature="Overview" description="View your health analytics, quick actions, and settings with a Basic or Pro subscription.">
                  {isMobile ? (
                    <div className="space-y-6">
                      {/* Mobile Stats Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                          <CardContent className="p-4 text-center">
                            <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
                            <div className="text-xl font-bold">{loading ? "..." : totalRecords}</div>
                            <p className="text-xs text-muted-foreground">Records</p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
                          <CardContent className="p-4 text-center">
                            <MessageSquare className="h-6 w-6 text-secondary mx-auto mb-2" />
                            <div className="text-xl font-bold">{loading ? "..." : totalConversations}</div>
                            <p className="text-xs text-muted-foreground">Chats</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Last Activity Card */}
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

                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Quick Actions</CardTitle>
                          <CardDescription>
                            Start using DrKnowsIt's features
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button 
                            variant="outline" 
                            className="w-full h-auto p-4 justify-start bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:bg-primary/20" 
                            onClick={() => setActiveTab('health')}
                          >
                            <Upload className="h-5 w-5 mr-3 text-primary" />
                            <div className="text-left">
                              <div className="font-medium">Upload Records</div>
                              <div className="text-sm text-muted-foreground">Add health documents</div>
                            </div>
                          </Button>

                          <Button 
                            variant="outline" 
                            className="w-full h-auto p-4 justify-start bg-gradient-to-r from-secondary/5 to-secondary/10 border-secondary/20 hover:bg-secondary/20" 
                            onClick={() => setActiveTab('health')}
                          >
                            <Calendar className="h-5 w-5 mr-3 text-secondary" />
                            <div className="text-left">
                              <div className="font-medium">Health Forms</div>
                              <div className="text-sm text-muted-foreground">Complete structured forms</div>
                            </div>
                          </Button>

                          <Button 
                            variant="outline" 
                            className="w-full h-auto p-4 justify-start bg-gradient-to-r from-accent/5 to-accent/10 border-accent/20 hover:bg-accent/20" 
                            onClick={() => setActiveTab('chat')}
                          >
                            <MessageSquare className="h-5 w-5 mr-3 text-accent" />
                            <div className="text-left">
                              <div className="font-medium">Chat with AI</div>
                              <div className="text-sm text-muted-foreground">Ask health questions</div>
                            </div>
                          </Button>
                        </CardContent>
                      </Card>

                      {/* AI Settings for Mobile */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            AI Settings
                          </CardTitle>
                          <CardDescription>
                            Customize your AI experience
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <AISettings />
                        </CardContent>
                      </Card>

                      {/* Feature Discovery */}
                      <FeatureDiscovery />
                    </div>
                  ) : (
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
                      <FeatureDiscovery />
                    </div>
                  )}
                </SubscriptionGate>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}