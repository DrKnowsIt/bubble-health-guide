import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Stethoscope, Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
interface DashboardHeaderProps {
  className?: string;
}
export const DashboardHeader = ({
  className
}: DashboardHeaderProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    subscription_tier,
    subscribed
  } = useSubscription();
  const handleLogout = async () => {
    await signOut();
  };
  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';
  };
  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const getTierDisplay = () => {
    if (!subscribed || !subscription_tier) return {
      text: 'Free',
      variant: 'secondary' as const
    };
    if (subscription_tier === 'pro') return {
      text: 'Pro',
      variant: 'default' as const
    };
    if (subscription_tier === 'basic') return {
      text: 'Basic',
      variant: 'outline' as const
    };
    return {
      text: 'Free',
      variant: 'secondary' as const
    };
  };
  const tierInfo = getTierDisplay();
  return <header className={cn("sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80", className)}>
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Brand Section */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">DrKnowsIt</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>

        {/* Marketing Navigation (visible when signed in) */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
          <Link to="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</Link>
          <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link>
        </nav>

        {/* Actions Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Tier Badge - Hidden on mobile */}
          <Badge variant={tierInfo.variant} className="hidden md:inline-flex">
            {tierInfo.text}
          </Badge>

          {/* Notifications */}
          

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-muted/50">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium leading-none">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none mt-0.5">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2 md:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </div>
              <DropdownMenuSeparator className="md:hidden" />
              <div className="p-2 md:hidden">
                <Badge variant={tierInfo.variant} className="text-xs">
                  {tierInfo.text} Plan
                </Badge>
              </div>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem asChild className="flex items-center gap-2 cursor-pointer">
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 text-destructive focus:text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
};