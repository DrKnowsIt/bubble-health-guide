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
import { SettingsDashboard } from "@/components/SettingsDashboard";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john@example.com",
    subscription: "Basic Plan",
    creditsRemaining: 85,
    joinDate: "March 2024"
  };

  const sidebarItems = [
    { id: "chat", label: "Chat with DrKnowItAll", icon: MessageCircle },
    { id: "health", label: "Health Profile", icon: Heart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        user={user}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className={`
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 fixed md:static inset-y-16 left-0 z-40 w-64 
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

            {/* User Stats */}
            <div className="mt-8 space-y-4">
              <Card className="medical-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Credits Remaining</p>
                      <p className="text-2xl font-bold text-primary">{user.creditsRemaining}</p>
                    </div>
                    <Activity className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="medical-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="text-sm font-medium text-foreground">{user.subscription}</p>
                    </div>
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </CardContent>
              </Card>
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
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {activeTab === "chat" && <ChatDashboard />}
            {activeTab === "health" && <HealthProfile user={user} />}
            {activeTab === "settings" && <SettingsDashboard user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;