import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsers } from '@/hooks/useUsers';
import { useHealthStats } from '@/hooks/useHealthStats';
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
import { EasyChatInterface } from '@/components/EasyChatInterface';
import { FreeUsersOnlyGate } from '@/components/FreeUsersOnlyGate';

import { useNavigate } from 'react-router-dom';
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

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const { subscribed, subscription_tier, createCheckoutSession } = useSubscription();
  const { users, selectedUser, setSelectedUser } = useUsers();
  const [activeTab, setActiveTab] = useState(() => {
    // Default to chat tab for subscribed users, easy-chat for free users
    return subscribed && subscription_tier ? "chat" : "easy-chat";
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addFamilyDialogOpen, setAddFamilyDialogOpen] = useState(false);
  
  // Update active tab when subscription changes
  useEffect(() => {
    // If user has subscription and is on easy-chat tab, switch to chat tab
    if (subscribed && subscription_tier && activeTab === "easy-chat") {
      setActiveTab("chat");
    }
    // If user loses subscription and is on a premium tab, switch to easy-chat
    if ((!subscribed || !subscription_tier) && activeTab !== "easy-chat") {
      setActiveTab("easy-chat");
    }
  }, [subscribed, subscription_tier, activeTab]);
  const { totalRecords, totalConversations, lastActivityTime, loading } = useHealthStats(selectedUser);
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

  const { toast } = useToast();
  const navigate = useNavigate();

  // Export functionality
  const exportToPDF = async () => {
    if (!selectedUser) return;
    
    try {
      await exportComprehensivePDFForUser(selectedUser, toast);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
      });
    }
  };

  // Standalone function for comprehensive PDF export
  const exportComprehensivePDFForUser = async (
    selectedUser: { id: string; first_name: string; last_name: string }, 
    toastFn: typeof toast
  ) => {
    // Get memory data
    const { data: memoryData } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('patient_id', selectedUser.id)
      .order('updated_at', { ascending: false });

    // Get Easy Chat sessions data  
    const { data: easyChatData } = await supabase
      .from('easy_chat_sessions')
      .select('*')
      .eq('patient_id', selectedUser.id)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(3);

    // Get diagnoses
    const { data: diagnosesData } = await supabase
      .from('conversation_diagnoses')
      .select('*')
      .eq('patient_id', selectedUser.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get health record summaries (simplified)
    const { data: healthSummaries } = await supabase
      .from('health_record_summaries')
      .select('created_at')
      .eq('user_id', selectedUser.id)
      .order('created_at', { ascending: false });

    // Get conversation solutions for holistic approaches
    const { data: solutionsData } = await supabase
      .from('conversation_solutions')
      .select('*')
      .eq('patient_id', selectedUser.id)
      .order('confidence', { ascending: false })
      .limit(8);

    // Generate comprehensive PDF
    const doc = new (await import('jspdf')).default();
    const userName = `${selectedUser.first_name} ${selectedUser.last_name}`;
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    let currentY = 40;

    // Add header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('DrKnowsIt', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('AI-Powered Health Assistant | www.drknowsit.com', 20, 28);
    doc.line(20, 32, 190, 32);

    // Report title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Comprehensive Clinical Health Report', 20, currentY);
    currentY += 15;

    // Patient info
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Patient: ${userName}`, 20, currentY);
    currentY += 6;
    doc.text(`Generated: ${currentDate}`, 20, currentY);
    currentY += 15;

    // Provider note
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Dear Healthcare Provider,', 20, currentY);
    currentY += 10;

    doc.setFont(undefined, 'normal');
    const providerNote = `This comprehensive report summarizes ${selectedUser.first_name}'s health information and AI-assisted analysis from our platform. The data includes patient-reported symptoms, historical health records, and AI-generated insights to support your clinical assessment.`;
    const splitNote = doc.splitTextToSize(providerNote, 170);
    doc.text(splitNote, 20, currentY);
    currentY += splitNote.length * 4 + 15;

    // Add diagnoses section
    if (diagnosesData && diagnosesData.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('AI-Identified Health Topics:', 20, currentY);
      currentY += 10;

      doc.setFont(undefined, 'normal');
      diagnosesData.forEach((diagnosis, index) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.text(`${index + 1}. ${diagnosis.diagnosis}`, 25, currentY);
        currentY += 6;
        doc.text(`   Confidence: ${Math.round(diagnosis.confidence * 100)}%`, 25, currentY);
        currentY += 6;
        if (diagnosis.reasoning) {
          const reasoning = doc.splitTextToSize(`   Analysis: ${diagnosis.reasoning}`, 165);
          doc.text(reasoning, 25, currentY);
          currentY += reasoning.length * 4 + 5;
        }
      });
      currentY += 10;
    }

    // Add health records summary
    if (healthSummaries && healthSummaries.length > 0) {
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Health Records Summary:', 20, currentY);
      currentY += 10;

      doc.setFont(undefined, 'normal');
      doc.text(`Total health records uploaded: ${healthSummaries.length}`, 25, currentY);
      currentY += 10;
    }

    // Add memory insights if available
    if (memoryData && memoryData.length > 0) {
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('AI Memory Insights:', 20, currentY);
      currentY += 10;

      doc.setFont(undefined, 'normal');
      memoryData.slice(0, 5).forEach((memory, index) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        if (memory.summary) {
          const insight = doc.splitTextToSize(`• ${memory.summary}`, 165);
          doc.text(insight, 25, currentY);
          currentY += insight.length * 4 + 3;
        }
      });
      currentY += 10;
    }

    // Add solutions/recommendations
    if (solutionsData && solutionsData.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('AI-Generated Health Recommendations:', 20, currentY);
      currentY += 10;

      doc.setFont(undefined, 'normal');
      solutionsData.slice(0, 5).forEach((solution, index) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.text(`${index + 1}. ${solution.solution}`, 25, currentY);
        currentY += 6;
        if (solution.reasoning) {
          const explanation = doc.splitTextToSize(`   Details: ${solution.reasoning}`, 165);
          doc.text(explanation, 25, currentY);
          currentY += explanation.length * 4 + 8;
        }
      });
    }

    // Add Easy Chat sessions if available
    if (easyChatData && easyChatData.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Easy Chat Sessions Summary:', 20, currentY);
      currentY += 10;

      doc.setFont(undefined, 'normal');
      easyChatData.forEach((session, index) => {
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }
        
        const sessionDate = new Date(session.created_at).toLocaleDateString();
        doc.text(`Session ${index + 1} (${sessionDate}):`, 25, currentY);
        currentY += 6;
        
        if (session.final_summary) {
          const summary = doc.splitTextToSize(`   ${session.final_summary}`, 165);
          doc.text(summary, 25, currentY);
          currentY += summary.length * 4 + 8;
        }
        
        // Add topics from session if available
        if (session.session_data && typeof session.session_data === 'object' && session.session_data !== null) {
          const sessionData = session.session_data as any;
          if (sessionData.topics_for_doctor && Array.isArray(sessionData.topics_for_doctor)) {
            doc.text('   Key Topics Discussed:', 25, currentY);
            currentY += 4;
            sessionData.topics_for_doctor.forEach((topic: any) => {
              if (currentY > 250) {
                doc.addPage();
                currentY = 20;
              }
              doc.text(`     • ${topic.topic}`, 25, currentY);
              currentY += 4;
            });
            currentY += 4;
          }
        }
      });
      currentY += 10;
    }

    // Add disclaimer
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 20;
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('IMPORTANT MEDICAL DISCLAIMER:', 20, currentY);
    currentY += 8;
    
    doc.setFont(undefined, 'normal');
    const disclaimer = `This report contains AI-generated insights and patient-reported information. It is NOT a medical diagnosis and should be used only as supplementary information for clinical assessment. Please conduct your own thorough examination and use your professional judgment. DrKnowsIt is not responsible for clinical decisions made based on this report.`;
    const splitDisclaimer = doc.splitTextToSize(disclaimer, 170);
    doc.text(splitDisclaimer, 20, currentY);

    // Save the PDF
    doc.save(`${userName.replace(/\s+/g, '_')}_Health_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    
    toastFn({
      title: "Success",
      description: "Medical report exported successfully!",
    });
  };

  const handleAddFamilyClick = () => {
    if (!subscribed || subscription_tier === 'basic') {
      toast({
        title: 'Pro plan required',
        description: 'Adding family members is a Pro feature.',
        action: (
          <ToastAction altText="View plans" onClick={() => navigate('/pricing')}>
            View plans
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
              Add family member
            </TooltipContent>
          </Tooltip>

          {/* Export Medical Report Button */}
          {selectedUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={exportToPDF}
                  size="sm"
                  variant="outline"
                  className="h-8"
                  aria-label="Export medical report"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Medical Report
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-0">
          {/* Tab Navigation */}
          {isMobile ? (
            // Mobile: 4-tab bottom navigation
            <div className="order-2 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 mt-auto">
              <TabsList className="w-full grid grid-cols-4 h-16 bg-muted/50">
                {(!subscribed || !subscription_tier) && (
                  <TabsTrigger value="easy-chat" className="flex flex-col items-center justify-center gap-1 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs font-medium">Easy</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="chat" className={cn("flex flex-col items-center justify-center gap-1 py-3 relative data-[state=active]:bg-background data-[state=active]:shadow-sm", !hasAccess('basic') && "opacity-50", (!subscribed || !subscription_tier) ? "col-span-1" : "col-start-1")}>
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
              <TabsList className="w-full grid grid-cols-4 h-20 bg-muted/50">
                {(!subscribed || !subscription_tier) && (
                  <TabsTrigger value="easy-chat" className="flex flex-col items-center justify-center gap-2 py-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <MessageSquare className="h-6 w-6" />
                    <span className="text-sm font-medium">Easy Chat</span>
                  </TabsTrigger>
                )}
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
            // Desktop: Top navigation
            <div className="px-4 pt-6">
              <TabsList className="grid w-full grid-cols-4">
                {(!subscribed || !subscription_tier) && (
                  <TabsTrigger value="easy-chat" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Easy Chat
                  </TabsTrigger>
                )}
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
          <div className={cn("flex-1 overflow-hidden min-h-0 flex flex-col", isMobile ? "order-1" : isTablet ? "order-1 p-4" : "")}>
            <TabsContent value="easy-chat" className="h-full mt-0 pt-4">
              <FreeUsersOnlyGate>
                <EasyChatInterface patientId={selectedUser?.id} />
              </FreeUsersOnlyGate>
            </TabsContent>

            <TabsContent value="chat" className="h-full mt-0 pt-4">
              <SubscriptionGate 
                requiredTier="basic" 
                feature="AI Chat" 
                description="Unlimited AI conversations require a subscription. Upgrade to access personalized AI health discussions with no limits."
              >
                {isMobile ? (
                  <MobileEnhancedChatInterface 
                    selectedUser={selectedUser}
                  />
                ) : isTablet ? (
                  <TabletChatInterface 
                    selectedUser={selectedUser}
                  />
                ) : (
                  <ChatGPTInterface selectedUser={selectedUser} />
                )}
              </SubscriptionGate>
            </TabsContent>

            <TabsContent value="health" className="h-full mt-0 pt-4">
              {isMobile ? (
                <MobileEnhancedHealthTab onTabChange={setActiveTab} />
              ) : (
                <SubscriptionGate requiredTier="basic" feature="Health Records" description="Manage your health records and forms with a Basic or Pro subscription.">
                  <div className="h-full overflow-y-auto">
                    <div className="space-y-6">
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

      {/* Add Family Member Dialog */}
      <AddFamilyMemberDialog 
        open={addFamilyDialogOpen} 
        onOpenChange={setAddFamilyDialogOpen} 
      />
    </div>
  );
}