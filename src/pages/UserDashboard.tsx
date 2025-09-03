import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { exportComprehensivePDFForUser } from '@/utils/pdfExport';
import { useUsersQuery } from '@/hooks/optimized/useUsersQuery';
import { useHealthStatsQuery } from '@/hooks/optimized/useHealthStatsQuery';
import { LoadingSkeleton, StatsLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, FileText, MessageSquare, Brain, Activity, Calendar, Upload, Plus, Lock, Crown, Heart, User, LogOut, FileDown } from 'lucide-react';
import { ChatGPTInterface } from '@/components/ChatGPTInterface';
import { DNAUpload } from '@/components/DNAUpload';
import { HealthForms } from '@/components/HealthForms';
import { AISettings } from '@/components/AISettings';
import { ContextualUserSelector } from '@/components/ContextualPatientSelector';
import { UserDropdown } from '@/components/UserDropdown';
import { AddFamilyMemberDialog } from '@/components/AddFamilyMemberDialog';
import { EnhancedAIFreeModeInterface } from '@/components/EnhancedAIFreeModeInterface';
import { FreeUsersOnlyGate } from '@/components/FreeUsersOnlyGate';
import { useFinalMedicalAnalysis } from '@/hooks/useFinalMedicalAnalysis';

import { useNavigate, useLocation } from 'react-router-dom';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { PlanSelectionCard } from '@/components/PlanSelectionCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FeatureDiscovery } from '@/components/FeatureDiscovery';
import { MobileEnhancedChatInterface } from '@/components/MobileEnhancedChatInterface';
import { MobileEnhancedHealthTab } from '@/components/MobileEnhancedHealthTab';
import { MobileEnhancedOverviewTab } from '@/components/MobileEnhancedOverviewTab';
import { TabletChatInterface } from '@/components/TabletChatInterface';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { ExportProgressModal } from '@/components/ExportProgressModal';

export default function UserDashboard() {
  console.log('UserDashboard: Component rendering started');
  
  const { user, signOut } = useAuth();
  const { subscribed, subscription_tier, createCheckoutSession } = useSubscription();
  const { users, selectedUser, setSelectedUser, loading } = useUsersQuery();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("easy-chat"); // Default to easy-chat for all users
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addFamilyDialogOpen, setAddFamilyDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  console.log('UserDashboard: State initialized', {
    user: !!user,
    subscribed,
    subscription_tier,
    usersCount: users.length,
    selectedUser: !!selectedUser,
    loading,
    activeTab,
    currentPath: location.pathname
  });
  
  // Update active tab when URL parameters change (with debouncing)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['chat', 'health', 'overview', 'easy-chat'].includes(tabParam)) {
      // Only update if different from current tab to prevent navigation loops
      if (tabParam !== activeTab) {
        console.log('UserDashboard: Tab change via URL:', tabParam);
        setActiveTab(tabParam);
      }
    } else if (!tabParam && activeTab !== "easy-chat") {
      // Default to easy-chat if no specific tab is selected
      console.log('UserDashboard: Setting default tab to easy-chat');
      setActiveTab("easy-chat");
    }
  }, [location.search, activeTab]);
  
  // Safety check: Ensure there's always a user selected when users exist
  // This helps prevent issues when switching between modes or tabs
  useEffect(() => {
    if (users.length > 0 && !selectedUser && !loading) {
      console.log('Dashboard safety check: No user selected but users exist, selecting primary user');
      const primaryUser = users.find(p => p.is_primary);
      const userToSelect = primaryUser || users[0];
      setSelectedUser(userToSelect);
    }
  }, [users, selectedUser, loading, setSelectedUser]);
  
  const healthStats = useHealthStatsQuery(selectedUser);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { currentConversation, messages } = useConversations(selectedUser);
  
  // State for tracking high confidence diagnoses
  const [currentConversationDiagnoses, setCurrentConversationDiagnoses] = useState<any[]>([]);
  
  // Fetch diagnoses for current conversation
  useEffect(() => {
    const fetchCurrentConversationDiagnoses = async () => {
      if (!currentConversation || !selectedUser?.id) {
        setCurrentConversationDiagnoses([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('conversation_diagnoses')
          .select('*')
          .eq('conversation_id', currentConversation)
          .eq('patient_id', selectedUser.id);
          
        if (error) throw error;
        setCurrentConversationDiagnoses(data || []);
      } catch (error) {
        console.error('Error fetching conversation diagnoses:', error);
        setCurrentConversationDiagnoses([]);
      }
    };
    
    fetchCurrentConversationDiagnoses();
  }, [currentConversation, selectedUser?.id]);
  
  
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

  const { toast } = useToast();
  const navigate = useNavigate();
  const { generateFinalAnalysis, loading: analysisLoading } = useFinalMedicalAnalysis();

  // Enhanced export functionality with progress modal
  const exportToPDF = async () => {
    if (!selectedUser) return;
    
    // Check if user has enough conversation/health data
    const hasHealthData = healthStats.totalRecords > 0 || healthStats.totalConversations > 0;
    
    if (!hasHealthData) {
      toast({
        title: "Not enough data yet",
        description: "DrKnowsIt doesn't know much about you yet to generate a comprehensive medical report. Try having some conversations or adding health records first.",
        variant: "default",
      });
      return;
    }
    
    try {
      // Show progress modal
      setExportModalOpen(true);

      // Generate final AI analysis
      const finalAnalysis = await generateFinalAnalysis(selectedUser);
      
      // Generate PDF with final analysis
      await exportComprehensivePDFForUser(selectedUser, toast, finalAnalysis);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Error", 
        description: "Failed to generate PDF report. Please try again.",
      });
    } finally {
      // Close progress modal
      setExportModalOpen(false);
    }
  };

  const handleAddFamilyClick = () => {
    if (!subscribed || subscription_tier !== 'pro') {
      toast({
        title: 'Pro Plan Required',
        description: 'Adding family members is only available with a Pro plan. Upgrade to manage multiple family members in one place.',
        action: (
          <ToastAction altText="Upgrade to Pro" onClick={() => navigate('/pricing')}>
            Upgrade to Pro
          </ToastAction>
        ),
      });
      return;
    }
    setAddFamilyDialogOpen(true);
  };

  // Tab configuration with subscription requirements
  const tabConfig = {
    chat: {
      requiredTier: 'basic',
      icon: MessageSquare,
      title: "AI Chat"
    },
    health: {
      requiredTier: null,
      icon: Heart,
      title: "Health"
    },
    overview: {
      requiredTier: null,
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

  console.log('UserDashboard: About to render main component');

  // Emergency fallback for debugging
  if (loading) {
    console.log('UserDashboard: Still loading, showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
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

      {/* Family Member Selector */}
      <div className="border-b border-border bg-background/95">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">User</span>
          <div className="w-64">
            <UserDropdown
              users={users}
              selectedUser={selectedUser}
              onUserSelect={setSelectedUser}
              open={dropdownOpen}
              onOpenChange={setDropdownOpen}
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleAddFamilyClick}
                aria-label="Add family member"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Add family member (Pro plan only)
            </TooltipContent>
          </Tooltip>

           {/* Export Medical Report Button - Only for subscribed users */}
           {selectedUser && hasAccess('basic') && (
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   onClick={exportToPDF}
                   size="sm"
                   variant="outline"
                    className={cn(
                     "h-8 bg-teal-500 border-teal-500 text-white hover:bg-teal-600 hover:border-teal-600 rounded-full",
                     // Flash green when there's at least 1 high confidence topic (>=70%) and 10+ back-and-forth messages in current chat
                     (currentConversationDiagnoses.some(d => d.confidence >= 0.7) && 
                      messages.length >= 10 && 
                      !analysisLoading)
                       ? "animate-pulse border-green-500 bg-green-50 hover:bg-green-100 text-green-700 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                       : ""
                   )}
                   aria-label="Export medical report"
                   disabled={analysisLoading}
                 >
                   {analysisLoading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                       Analyzing...
                     </>
                   ) : (
                     <>
                       <FileDown className="h-4 w-4 mr-2" />
                       Export Medical Report
                     </>
                   )}
                 </Button>
               </TooltipTrigger>
               <TooltipContent>
                 Export comprehensive medical report
               </TooltipContent>
             </Tooltip>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={(newTab) => {
          console.log('UserDashboard: Manual tab change:', newTab);
          setActiveTab(newTab);
          navigate(`/dashboard?tab=${newTab}`, { replace: true });
        }} className="h-full flex flex-col min-h-0">
          {/* Tab Navigation */}
          {isMobile ? (
            // Mobile: Dynamic tab bottom navigation
            <div className="order-2 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 mt-auto">
              <TabsList className={cn("w-full grid h-16 bg-muted/50", subscribed && subscription_tier ? "grid-cols-3" : "grid-cols-4")}>
                {(!subscribed || !subscription_tier) && (
                  <TabsTrigger value="easy-chat" className="flex flex-col items-center justify-center gap-1 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs font-medium">Easy</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="chat" className="flex flex-col items-center justify-center gap-1 py-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-xs font-medium">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="health" className="flex flex-col items-center justify-center gap-1 py-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Heart className="h-5 w-5" />
                  <span className="text-xs font-medium">Health</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex flex-col items-center justify-center gap-1 py-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Activity className="h-5 w-5" />
                  <span className="text-xs font-medium">Overview</span>
                </TabsTrigger>
              </TabsList>
            </div>
          ) : isTablet ? (
            // Tablet: Enhanced bottom navigation with larger touch targets
            <div className="order-2 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 mt-auto">
              <TabsList className={cn("w-full grid h-20 bg-muted/50", subscribed && subscription_tier ? "grid-cols-3" : "grid-cols-4")}>
                {(!subscribed || !subscription_tier) && (
                  <TabsTrigger value="easy-chat" className="flex flex-col items-center justify-center gap-2 py-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <MessageSquare className="h-6 w-6" />
                    <span className="text-sm font-medium">AI Free Mode</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="chat" className="flex flex-col items-center justify-center gap-2 py-4 relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MessageSquare className="h-6 w-6" />
                  <span className="text-sm font-medium">AI Chat</span>
                </TabsTrigger>
                <TabsTrigger value="health" className="flex flex-col items-center justify-center gap-2 py-4 relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Heart className="h-6 w-6" />
                  <span className="text-sm font-medium">Health</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex flex-col items-center justify-center gap-2 py-4 relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Activity className="h-6 w-6" />
                  <span className="text-sm font-medium">Overview</span>
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            // Desktop: Top navigation
            <div className="px-4 pt-6">
              <TabsList className={cn("grid w-full", subscribed && subscription_tier ? "grid-cols-3" : "grid-cols-4")}>
                {(!subscribed || !subscription_tier) && (
                  <TabsTrigger value="easy-chat" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Free Mode
                  </TabsTrigger>
                )}
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="health" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Health
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Overview
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Tab Content */}
          <div className={cn("flex-1 overflow-hidden min-h-0 flex flex-col", isMobile ? "order-1" : isTablet ? "order-1 p-4" : "")}>
            <TabsContent value="easy-chat" className="h-full mt-0 pt-4">
              <FreeUsersOnlyGate>
                <EnhancedAIFreeModeInterface patientId={selectedUser?.id} />
              </FreeUsersOnlyGate>
            </TabsContent>

            <TabsContent value="chat" className="h-full mt-0 pt-4">
              {isMobile ? (
                <MobileEnhancedChatInterface 
                  selectedUser={selectedUser}
                />
              ) : isTablet ? (
                <TabletChatInterface 
                  selectedUser={selectedUser}
                />
              ) : (
                <SubscriptionGate 
                  requiredTier="basic" 
                  feature="AI Chat" 
                  description="Start unlimited conversations with our advanced AI health assistant. Get personalized insights, symptom analysis, and health recommendations with a Basic or Pro subscription."
                >
                  <ChatGPTInterface selectedUser={selectedUser} />
                </SubscriptionGate>
              )}
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0 pt-4">
              {isMobile ? (
                <MobileEnhancedHealthTab onTabChange={setActiveTab} />
              ) : (
                <div className="h-full overflow-y-auto">
                  <div className="space-y-6">
                    <HealthForms selectedPatient={selectedUser} />
                    
                    <SubscriptionGate requiredTier="pro" feature="DNA/Genetics Analysis" description="Upload DNA data from companies like 23andMe or Ancestry for advanced genetic insights — available on Pro.">
                      <DNAUpload 
                        selectedPatient={selectedUser} 
                        onUploadComplete={() => {}}
                      />
                    </SubscriptionGate>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overview" className="h-full mt-0 pt-4">
              {isMobile ? (
                <MobileEnhancedOverviewTab onTabChange={setActiveTab} selectedUser={selectedUser} />
              ) : (
                <div className="h-full overflow-y-auto">
                  <div className="space-y-6">
                      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Health Records</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{healthStats.loading ? "..." : healthStats.totalRecords}</div>
                            <p className="text-xs text-muted-foreground">Total records uploaded</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">AI Conversations</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{healthStats.loading ? "..." : healthStats.totalConversations}</div>
                            <p className="text-xs text-muted-foreground">Total conversations</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{healthStats.loading ? "..." : formatLastActivity(healthStats.lastActivityTime)}</div>
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
                            <Button variant="outline" className="h-auto p-4 flex-col items-start" onClick={() => {
                              setActiveTab('health');
                              navigate('/dashboard?tab=health', { replace: true });
                            }}>
                              <Calendar className="h-5 w-5 mb-2" />
                              <span className="font-medium">Complete Health Forms</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Fill out structured forms for comprehensive health data
                              </span>
                            </Button>

                            <Button variant="outline" className="h-auto p-4 flex-col items-start" onClick={() => {
                              setActiveTab('health');
                              navigate('/dashboard?tab=health', { replace: true });
                            }}>
                              <Upload className="h-5 w-5 mb-2" />
                              <span className="font-medium">Upload Health Records</span>
                              <span className="text-sm text-muted-foreground text-left">
                                Add medical history, lab results, or other health documents
                              </span>
                            </Button>

                            <Button variant="outline" className="h-auto p-4 flex-col items-start" onClick={() => {
                              setActiveTab('chat');
                              navigate('/dashboard?tab=chat', { replace: true });
                            }}>
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
                             <AISettings selectedUser={selectedUser || undefined} />
                           </CardContent>
                        </Card>
                      </div>

                    {/* Feature Discovery */}
                    <FeatureDiscovery onNavigateToTab={(tab) => {
                      setActiveTab(tab);
                      navigate(`/dashboard?tab=${tab}`, { replace: true });
                    }} />
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Add Family Member Dialog */}
      <AddFamilyMemberDialog 
        open={addFamilyDialogOpen} 
        onOpenChange={setAddFamilyDialogOpen} 
      />

      {/* Export Progress Modal */}
      <ExportProgressModal 
        open={exportModalOpen} 
        onOpenChange={setExportModalOpen} 
      />
    </div>
  );
}