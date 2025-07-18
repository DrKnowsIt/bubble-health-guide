import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  Plus
} from 'lucide-react';
import { ChatInterface } from '@/components/ChatInterface';
import { UserSettings } from '@/components/UserSettings';
import { HealthRecords } from '@/components/HealthRecords';
import { AISettings } from '@/components/AISettings';

export default function UserDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">DrKnowItAll</h1>
              </div>
              <Badge variant="secondary">Dashboard</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.user_metadata?.first_name || user?.email}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Records
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

          <TabsContent value="chat" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Health Assistant
                </CardTitle>
                <CardDescription>
                  Chat with DrKnowItAll for personalized health guidance and medical insights.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChatInterface />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <HealthRecords />
          </TabsContent>

          <TabsContent value="ai-settings" className="space-y-6">
            <AISettings />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <UserSettings />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health Records</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Total records uploaded</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Conversations</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground">Total conversations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2h</div>
                  <p className="text-xs text-muted-foreground">Ago</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks to help you get the most out of DrKnowItAll
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Ask DrKnowItAll about your health concerns
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}