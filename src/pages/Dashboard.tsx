import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  User, 
  Settings, 
  FileText, 
  Heart, 
  Mic, 
  Download,
  Edit,
  Calendar,
  Activity,
  Shield,
  CreditCard,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ChatDashboard } from "@/components/ChatDashboard";
import { HealthProfile } from "@/components/HealthProfile";
import { UserSettings } from "@/components/UserSettings";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { TierStatus } from "@/components/TierStatus";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { user } = useAuth();
  const { subscribed, subscription_tier, loading } = useSubscription();

  const sidebarItems = [
    { id: "chat", label: "Chat with DrKnowItAll", icon: MessageCircle },
    { id: "health", label: "Health Profile", icon: Heart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (!user) {
    return <div>Loading...</div>;
  }

  const userForHeader = {
    name: user.user_metadata?.first_name && user.user_metadata?.last_name 
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : user.email?.split('@')[0] || 'User',
    email: user.email || '',
    subscription: subscription_tier === 'pro' ? 'Pro Plan' : subscription_tier === 'basic' ? 'Basic Plan' : 'Free Plan'
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        user={userForHeader}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Sidebar */}
        <div className={`
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 fixed md:static inset-y-20 left-0 z-40 w-64 
          bg-card border-r border-border transition-transform duration-300 ease-out
        `}>
          <div className="p-6">
            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-smooth
                    ${activeTab === item.id 
                      ? 'bg-primary text-primary-foreground shadow-bubble' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Subscription Status */}
            <div className="mt-8 space-y-4">
              <TierStatus showUpgradeButton={true} />
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 p-6 flex flex-col min-h-0">
            {activeTab === "chat" && <ChatDashboard />}
            {activeTab === "health" && <HealthProfile user={userForHeader} />}
            {activeTab === "settings" && <UserSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;