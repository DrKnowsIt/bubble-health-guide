import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Heart, 
  Activity,
  Lock
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ChatGPTInterface } from "@/components/ChatGPTInterface";
import { HealthProfile } from "@/components/HealthProfile";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsers } from "@/hooks/useUsers";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Upload, MessageSquare } from "lucide-react";
import { useHealthStats } from "@/hooks/useHealthStats";
import { ContextualUserSelector } from "@/components/ContextualPatientSelector";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const { user } = useAuth();
  const { subscribed, subscription_tier } = useSubscription();
  const { users, selectedUser, setSelectedUser } = useUsers();
  const { totalRecords, totalConversations, lastActivityTime } = useHealthStats();

  if (!user) {
    return <div>Loading...</div>;
  }

  // Check if user has access to a specific tier
  const hasAccess = (requiredTier: string | null) => {
    if (!requiredTier) return true;
    if (!subscribed || !subscription_tier) return false;
    if (requiredTier === 'basic') {
      return subscription_tier === 'basic' || subscription_tier === 'pro';
    }
    if (requiredTier === 'pro') {
      return subscription_tier === 'pro';
    }
    return false;
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-7xl mx-auto">
              <TabsList className="h-auto bg-transparent border-0 p-0">
                <TabsTrigger 
                  value="chat" 
                  className={cn(
                    "flex items-center gap-2 relative rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                    "px-4 py-3",
                    !hasAccess('basic') && "opacity-50"
                  )}
                >
                  <div className="relative">
                    <MessageCircle className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  AI Chat
                </TabsTrigger>
                
                <TabsTrigger 
                  value="health" 
                  className={cn(
                    "flex items-center gap-2 relative rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                    "px-4 py-3",
                    !hasAccess('basic') && "opacity-50"
                  )}
                >
                  <div className="relative">
                    <Heart className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Health
                </TabsTrigger>
                
                <TabsTrigger 
                  value="overview" 
                  className={cn(
                    "flex items-center gap-2 relative rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                    "px-4 py-3",
                    !hasAccess('basic') && "opacity-50"
                  )}
                >
                  <div className="relative">
                    <Activity className="h-4 w-4" />
                    {!hasAccess('basic') && <Lock className="h-2 w-2 absolute -top-1 -right-1" />}
                  </div>
                  Overview
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 container max-w-7xl mx-auto p-6">
            <TabsContent value="chat" className="h-full mt-0">
              <SubscriptionGate 
                requiredTier="basic" 
                feature="AI Chat" 
                description="Start conversations with our AI health assistant using a Basic or Pro subscription."
              >
                <div className="space-y-4 h-full flex flex-col">
                  {/* User Selector */}
                  <ContextualUserSelector 
                    users={users} 
                    selectedUser={selectedUser} 
                    onUserSelect={setSelectedUser} 
                    hasAccess={hasAccess('basic')} 
                    title="Chat with AI" 
                    description="Select a user to have personalized conversations" 
                  />
                  
                  {/* Chat Interface */}
                  <div className="flex-1 min-h-0">
                    <div className="h-full flex flex-col">
                      <div className="mb-4 flex-shrink-0">
                        <h2 className="text-lg font-semibold">AI Health Assistant</h2>
                        <p className="text-sm text-muted-foreground">
                          Chat with DrKnowsIt for personalized health guidance and medical insights.
                        </p>
                      </div>
                      <div className="flex-1 min-h-0">
                        <ChatGPTInterface />
                      </div>
                    </div>
                  </div>
                </div>
              </SubscriptionGate>
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0">
              <SubscriptionGate 
                requiredTier="basic" 
                feature="Health Management" 
                description="Store and manage your health records and forms with a Basic or Pro subscription."
              >
                <HealthProfile />
              </SubscriptionGate>
            </TabsContent>

            <TabsContent value="overview" className="h-full mt-0">
              <SubscriptionGate 
                requiredTier="basic" 
                feature="Overview Dashboard" 
                description="View your health analytics and insights with a Basic or Pro subscription."
              >
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">Total Records</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalRecords}</div>
                        <p className="text-xs text-muted-foreground">Health records stored</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">Conversations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalConversations}</div>
                        <p className="text-xs text-muted-foreground">AI chat sessions</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">Last Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {lastActivityTime ? formatLastActivity(lastActivityTime) : "..."}
                        </div>
                        <p className="text-xs text-muted-foreground">Ago</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>
                        Common tasks to help you get the most out of DrKnowsIt
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <Button 
                        variant="outline" 
                        className="h-auto p-4 flex-col items-start" 
                        onClick={() => setActiveTab('health')}
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
                        <MessageSquare className="h-5 w-5 mb-2" />
                        <span className="font-medium">Start AI Chat</span>
                        <span className="text-sm text-muted-foreground text-left">
                          Ask questions and get personalized health guidance
                        </span>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </SubscriptionGate>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;