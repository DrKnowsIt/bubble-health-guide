import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'drknowsit_cookie_consent';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to not interfere with page load
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      analytics: true,
      functional: true,
    }));
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      analytics: false,
      functional: true, // Keep essential cookies
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-500">
      <Card className="max-w-4xl mx-auto bg-card/95 backdrop-blur-sm border-border shadow-lg">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">We value your privacy</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. 
                  By clicking "Accept All", you consent to our use of cookies.{' '}
                  <Link to="/privacy-policy" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="flex-1 sm:flex-none"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="flex-1 sm:flex-none"
              >
                Accept All
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDecline}
                className="h-8 w-8 sm:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
