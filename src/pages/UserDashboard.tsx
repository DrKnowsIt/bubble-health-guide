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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">DrKnowsIt</h1>
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
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          {isMobile ? (
            // Mobile: Simple bottom navigation
            <div className="order-2 border-t border-border bg-background p-2 mt-auto">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="chat" className="flex flex-col items-center gap-1 py-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="health" className="flex flex-col items-center gap-1 py-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs">Records</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex flex-col items-center gap-1 py-2">
                  <FileText className="h-4 w-4" />
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
            </div>
          )}

          {/* Tab Content */}
          <div className={cn("flex-1 overflow-hidden", isMobile ? "order-1" : "px-4 pb-6")}>
            <TabsContent value="chat" className="h-full mt-0 pt-4">
              {isMobile ? (
                <div className="flex flex-col h-full">
                  <ChatInterfaceWithPatients isMobile={true} />
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">AI Health Assistant</h2>
                    <p className="text-sm text-muted-foreground">Chat with DrKnowsIt for personalized health guidance and medical insights.</p>
                  </div>
                  <div className="flex-1">
                    <ChatInterfaceWithPatients />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0 pt-4">
              <div className={cn("h-full overflow-y-auto", isMobile ? "p-4" : "")}>
                <HealthRecords />
              </div>
            </TabsContent>

            {!isMobile && (
              <TabsContent value="forms" className="h-full mt-0 pt-4">
                <div className="h-full overflow-y-auto">
                  <HealthForms onFormSubmit={() => setActiveTab('health')} />
                </div>
              </TabsContent>
            )}

            {!isMobile && (
              <TabsContent value="ai-settings" className="h-full mt-0 pt-4">
                <div className="h-full overflow-y-auto">
                  <AISettings />
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
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}