import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  LogOut
} from 'lucide-react';
import { ChatInterfaceWithPatients } from '@/components/ChatInterfaceWithPatients';
import { UserSettings } from '@/components/UserSettings';
import { HealthRecords } from '@/components/HealthRecords';
import { HealthForms } from '@/components/HealthForms';
import { AISettings } from '@/components/AISettings';
import { cn } from '@/lib/utils';

export default function UserDashboard() {
  const { user, signOut } = useAuth();
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

  return (
    <div className={cn("min-h-screen bg-background", isMobile && activeTab === 'chat' && "pb-0")}>
      {/* Header - Simplified for mobile */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <h1 className={cn("font-semibold", isMobile ? "text-lg" : "text-xl")}>DrKnowsIt</h1>
              </div>
              {!isMobile && <Badge variant="secondary">Dashboard</Badge>}
            </div>
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
                size={isMobile ? "sm" : "sm"}
                className={cn(
                  "flex items-center gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white",
                  isMobile && "px-2"
                )}
              >
                <LogOut className="h-4 w-4" />
                {!isMobile && "Logout"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "container mx-auto px-4",
        isMobile && activeTab === 'chat' ? "py-0" : "py-6"
      )}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className={cn(
          isMobile && activeTab === 'chat' ? "h-[calc(100vh-64px)] flex flex-col" : "space-y-6"
        )}>
          {/* Mobile: Fixed bottom tabs for chat, scrollable tabs for others */}
          {isMobile ? (
            <div className={cn(
              "order-2 border-t border-border bg-background",
              activeTab === 'chat' ? "fixed bottom-0 left-0 right-0 p-2" : "sticky top-16 z-10 p-4"
            )}>
              <TabsList className={cn(
                "w-full",
                activeTab === 'chat' 
                  ? "grid grid-cols-3 gap-1" 
                  : "grid grid-cols-2 md:grid-cols-6 gap-1"
              )}>
                {activeTab === 'chat' ? (
                  // Chat mode: only show essential tabs
                  <>
                    <TabsTrigger value="chat" className="flex flex-col items-center gap-1 text-xs">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="flex flex-col items-center gap-1 text-xs">
                      <FileText className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex flex-col items-center gap-1 text-xs">
                      <Settings className="h-4 w-4" />
                      More
                    </TabsTrigger>
                  </>
                ) : (
                  // All other tabs
                  <>
                    <TabsTrigger value="chat" className="flex flex-col items-center gap-1 text-xs">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex flex-col items-center gap-1 text-xs">
                      <Activity className="h-4 w-4" />
                      Records
                    </TabsTrigger>
                    <TabsTrigger value="forms" className="flex flex-col items-center gap-1 text-xs">
                      <Calendar className="h-4 w-4" />
                      Forms
                    </TabsTrigger>
                    <TabsTrigger value="ai-settings" className="flex flex-col items-center gap-1 text-xs">
                      <Brain className="h-4 w-4" />
                      AI
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex flex-col items-center gap-1 text-xs">
                      <Settings className="h-4 w-4" />
                      Account
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="flex flex-col items-center gap-1 text-xs">
                      <FileText className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
          ) : (
            // Desktop: original tab layout
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Health Records
              </TabsTrigger>
              <TabsTrigger value="forms" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Health Forms
              </TabsTrigger>
              <TabsTrigger value="ai-settings" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Settings
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Overview
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent 
            value="chat" 
            className={cn(
              isMobile ? "flex-1 order-1 overflow-hidden" : "space-y-6"
            )}
          >
            {isMobile ? (
              // Mobile: Full screen chat
              <div className="flex flex-col h-full">
                <ChatInterfaceWithPatients isMobile={true} />
              </div>
            ) : (
              // Desktop: Card layout
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Health Assistant
                  </CardTitle>
                  <CardDescription>
                    Chat with DrKnowsIt for personalized health guidance and medical insights.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChatInterfaceWithPatients />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="health" className={cn(isMobile ? "order-1 px-4 py-6" : "space-y-6")}>
            <HealthRecords />
          </TabsContent>

          <TabsContent value="forms" className={cn(isMobile ? "order-1 px-4 py-6" : "space-y-6")}>
            <HealthForms onFormSubmit={() => setActiveTab('health')} />
          </TabsContent>

          <TabsContent value="ai-settings" className={cn(isMobile ? "order-1 px-4 py-6" : "space-y-6")}>
            <AISettings />
          </TabsContent>

          <TabsContent value="settings" className={cn(isMobile ? "order-1 px-4 py-6 pb-20" : "space-y-6")}>
            {/* Mobile: Show additional navigation when in settings */}
            {isMobile && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Quick Access</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('health')}
                    className="flex flex-col items-center gap-2 h-auto p-4"
                  >
                    <Activity className="h-5 w-5" />
                    <span className="text-sm">Health Records</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('forms')}
                    className="flex flex-col items-center gap-2 h-auto p-4"
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="text-sm">Health Forms</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('ai-settings')}
                    className="flex flex-col items-center gap-2 h-auto p-4"
                  >
                    <Brain className="h-5 w-5" />
                    <span className="text-sm">AI Settings</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('overview')}
                    className="flex flex-col items-center gap-2 h-auto p-4"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-sm">Overview</span>
                  </Button>
                </CardContent>
              </Card>
            )}
            <UserSettings />
          </TabsContent>

          <TabsContent value="overview" className={cn(isMobile ? "order-1 px-4 py-6 pb-20" : "space-y-6")}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}