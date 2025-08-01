import { useState } from 'react';
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
  User, 
  Settings, 
  FileText, 
  MessageSquare, 
  Brain,
  Heart,
  Activity,
  Calendar,
  Upload,
  Plus,
  LogOut,
  Lock,
  Crown
} from 'lucide-react';
import { ChatInterfaceWithPatients } from '@/components/ChatInterfaceWithPatients';
import { UserSettings } from '@/components/UserSettings';
import { HealthRecords } from '@/components/HealthRecords';
import { HealthForms } from '@/components/HealthForms';
import { AISettings } from '@/components/AISettings';
import { PatientDropdown } from '@/components/PatientDropdown';
import { cn } from '@/lib/utils';

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const { subscribed, subscription_tier, createCheckoutSession } = useSubscription();
  const { patients, selectedPatient, setSelectedPatient } = usePatients();
  const [activeTab, setActiveTab] = useState('chat');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
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

  // Tab configuration with subscription requirements
  const tabConfig = {
    chat: { requiresSubscription: true, icon: MessageSquare, title: "AI Chat" },
    health: { requiresSubscription: true, icon: Activity, title: "Health Records" },
    forms: { requiresSubscription: true, icon: Calendar, title: "Health Forms" },
    'ai-settings': { requiresSubscription: true, icon: Brain, title: "AI Settings" },
    overview: { requiresSubscription: true, icon: FileText, title: "Overview" },
    settings: { requiresSubscription: false, icon: Settings, title: "Account" }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Subscription Alert */}
      {!subscribed && (
        <div className="bg-primary/10 border-b border-primary/20 p-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Upgrade to unlock all features</span>
            </div>
            <Button size="sm" onClick={handleUpgrade} className="bg-primary hover:bg-primary/90">
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">DrKnowsIt</h1>
            </div>
            
            {/* Global Patient Selection - Only show for patient-specific tabs */}
            {(activeTab === 'chat' || activeTab === 'health' || activeTab === 'forms') && (
              <div className={cn("flex items-center gap-3", !subscribed && "opacity-50")}>
                <span className="text-sm text-muted-foreground hidden md:block">
                  Current Patient:
                </span>
                <div className="min-w-[200px]">
                  <PatientDropdown
                    patients={patients}
                    selectedPatient={selectedPatient}
                    onPatientSelect={(patient) => subscribed ? setSelectedPatient(patient) : null}
                    open={subscribed ? patientDropdownOpen : false}
                    onOpenChange={subscribed ? setPatientDropdownOpen : () => {}}
                  />
                </div>
                {!subscribed && (
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Requires subscription</span>
                  </div>
                )}
                {subscribed && !selectedPatient && patients.length > 0 && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    Select a patient to view their data
                  </span>
                )}
              </div>
            )}
            
            {/* Center Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/#features" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  const currentPath = window.location.pathname;
                  if (currentPath === '/') {
                    e.preventDefault();
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Features
              </a>
              <a 
                href="/#how-it-works" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  const currentPath = window.location.pathname;
                  if (currentPath === '/') {
                    e.preventDefault();
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                How It Works
              </a>
              <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </nav>
            <div className="flex items-center gap-2">
              {!isMobile && (
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.user_metadata?.first_name || user?.email}
                </span>
              )}
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <Button 
                onClick={() => signOut()}
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Logout</span>}
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                  className={cn("flex flex-col items-center gap-1 py-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <MessageSquare className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs">Chat</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className={cn("flex flex-col items-center gap-1 py-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <Activity className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-xs">Records</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="overview" 
                  className={cn("flex flex-col items-center gap-1 py-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <FileText className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
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
                  className={cn("flex items-center gap-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <MessageSquare className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  AI Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className={cn("flex items-center gap-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <Activity className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Health Records
                </TabsTrigger>
                <TabsTrigger 
                  value="forms" 
                  className={cn("flex items-center gap-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <Calendar className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Health Forms
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-settings" 
                  className={cn("flex items-center gap-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <Brain className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  AI Settings
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger 
                  value="overview" 
                  className={cn("flex items-center gap-2 relative", !subscribed && "opacity-50")}
                  disabled={!subscribed}
                >
                  <div className="relative">
                    <FileText className="h-4 w-4" />
                    {!subscribed && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Overview
                </TabsTrigger>
              </TabsList>
            </div>
          )}

           {/* Tab Content */}
          <div className={cn("flex-1 overflow-hidden", isMobile ? "order-1" : "px-4 pb-6")}>
            <TabsContent value="chat" className="h-full mt-0 pt-4">
              {!subscribed ? (
                <div className="flex items-center justify-center h-full">
                  <Card className="max-w-md">
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Lock className="h-6 w-6" />
                        </div>
                      </div>
                      <CardTitle>AI Chat Requires Subscription</CardTitle>
                      <CardDescription>
                        Upgrade to unlock unlimited AI conversations and personalized health guidance.
                      </CardDescription>
                    </CardHeader>
                    <div className="px-6 pb-6">
                      <Button onClick={handleUpgrade} className="w-full">
                        Upgrade to Pro ($50/month)
                      </Button>
                    </div>
                  </Card>
                </div>
              ) : isMobile ? (
                <div className="flex flex-col h-full">
                  <ChatInterfaceWithPatients isMobile={true} selectedPatient={selectedPatient} />
                </div>
              ) : (
                <div className="h-full flex flex-col min-h-[calc(100vh-200px)]">
                  <div className="mb-4 flex-shrink-0">
                    <h2 className="text-lg font-semibold">AI Health Assistant</h2>
                    <p className="text-sm text-muted-foreground">Chat with DrKnowsIt for personalized health guidance and medical insights.</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ChatInterfaceWithPatients selectedPatient={selectedPatient} />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0 pt-4">
              <div className={cn("h-full overflow-y-auto", isMobile ? "p-4" : "")}>
                {!subscribed ? (
                  <div className="flex items-center justify-center h-full">
                    <Card className="max-w-md">
                      <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Lock className="h-6 w-6" />
                          </div>
                        </div>
                        <CardTitle>Health Records Require Subscription</CardTitle>
                        <CardDescription>
                          Upgrade to store and manage your health records securely.
                        </CardDescription>
                      </CardHeader>
                      <div className="px-6 pb-6">
                        <Button onClick={handleUpgrade} className="w-full">
                          Upgrade to Pro ($50/month)
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <HealthRecords selectedPatient={selectedPatient} />
                )}
              </div>
            </TabsContent>

            {!isMobile && (
              <TabsContent value="forms" className="h-full mt-0 pt-4">
                <div className="h-full overflow-y-auto">
                  {!subscribed ? (
                    <div className="flex items-center justify-center h-full">
                      <Card className="max-w-md">
                        <CardHeader className="text-center">
                          <div className="flex justify-center mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Lock className="h-6 w-6" />
                            </div>
                          </div>
                          <CardTitle>Health Forms Require Subscription</CardTitle>
                          <CardDescription>
                            Upgrade to access structured health forms and comprehensive data entry.
                          </CardDescription>
                        </CardHeader>
                        <div className="px-6 pb-6">
                          <Button onClick={handleUpgrade} className="w-full">
                            Upgrade to Pro ($50/month)
                          </Button>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <HealthForms selectedPatient={selectedPatient} onFormSubmit={() => setActiveTab('health')} />
                  )}
                </div>
              </TabsContent>
            )}

            {!isMobile && (
              <TabsContent value="ai-settings" className="h-full mt-0 pt-4">
                <div className="h-full overflow-y-auto">
                  {!subscribed ? (
                    <div className="flex items-center justify-center h-full">
                      <Card className="max-w-md">
                        <CardHeader className="text-center">
                          <div className="flex justify-center mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Lock className="h-6 w-6" />
                            </div>
                          </div>
                          <CardTitle>AI Settings Require Subscription</CardTitle>
                          <CardDescription>
                            Upgrade to customize AI behavior and manage memory settings.
                          </CardDescription>
                        </CardHeader>
                        <div className="px-6 pb-6">
                          <Button onClick={handleUpgrade} className="w-full">
                            Upgrade to Pro ($50/month)
                          </Button>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <AISettings />
                  )}
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
                {!subscribed ? (
                  <div className="flex items-center justify-center h-full">
                    <Card className="max-w-md">
                      <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Lock className="h-6 w-6" />
                          </div>
                        </div>
                        <CardTitle>Overview Requires Subscription</CardTitle>
                        <CardDescription>
                          Upgrade to view your health analytics and activity summary.
                        </CardDescription>
                      </CardHeader>
                      <div className="px-6 pb-6">
                        <Button onClick={handleUpgrade} className="w-full">
                          Upgrade to Pro ($50/month)
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : (
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
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}