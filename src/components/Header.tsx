import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stethoscope, Menu, X, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const Header = ({ onSignIn, onSignUp }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bubble">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">DrKnowItAll</span>
              <span className="text-xs text-muted-foreground">AI Medical Guidance</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              Pricing
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button variant="outline" size="sm" className="btn-outline" onClick={onSignIn}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
            <Button size="sm" className="btn-primary" onClick={onSignUp}>
              <User className="h-4 w-4 mr-2" />
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:text-primary transition-smooth"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-out",
            isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="pb-4 pt-2 space-y-2">
            <a
              href="#features"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </a>
            <div className="border-t border-border pt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full btn-outline" onClick={onSignIn}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
              <Button size="sm" className="w-full btn-primary" onClick={onSignUp}>
                <User className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};