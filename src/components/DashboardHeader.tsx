import { Button } from "@/components/ui/button";
import { Stethoscope, Menu, LogOut, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardNavMenu } from "@/components/DashboardNavMenu";

interface DashboardHeaderProps {
  user: {
    name: string;
    email: string;
    subscription: string;
  };
  onMobileMenuToggle: () => void;
}

export const DashboardHeader = ({ user, onMobileMenuToggle }: DashboardHeaderProps) => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileMenuToggle}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bubble">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-foreground">DrKnowsIt</span>
              <span className="text-xs text-muted-foreground ml-2">Dashboard</span>
            </div>
          </div>
        </div>

        {/* Center Navigation Menu */}
        <div className="hidden md:flex">
          <DashboardNavMenu />
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full"></span>
          </Button>
          
          <Button 
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};