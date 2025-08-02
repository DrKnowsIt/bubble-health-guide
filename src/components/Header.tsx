import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stethoscope, Menu, X, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bubble">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">DrKnowsIt</span>
              <span className="text-xs text-muted-foreground">AI Medical Guidance</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/#features"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={(e) => {
                const currentPath = window.location.pathname;
                if (currentPath === '/') {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Features
            </Link>
            <Link
              to="/#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={(e) => {
                const currentPath = window.location.pathname;
                if (currentPath === '/') {
                  e.preventDefault();
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              How It Works
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              Pricing
            </Link>
            <Link
              to="/faq"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              FAQ
            </Link>
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
            isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="pb-4 pt-2 space-y-2">
            <Link
              to="/#features"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={(e) => {
                const currentPath = window.location.pathname;
                if (currentPath === '/') {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }
                setIsMenuOpen(false);
              }}
            >
              Features
            </Link>
            <Link
              to="/#how-it-works"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={(e) => {
                const currentPath = window.location.pathname;
                if (currentPath === '/') {
                  e.preventDefault();
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }
                setIsMenuOpen(false);
              }}
            >
              How It Works
            </Link>
            <Link
              to="/pricing"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              to="/faq"
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              FAQ
            </Link>
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