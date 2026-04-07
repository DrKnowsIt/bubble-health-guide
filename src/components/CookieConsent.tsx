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
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Cookie className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              We use cookies to improve your experience.{' '}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Learn more
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="xs" onClick={handleDecline}>
              Decline
            </Button>
            <Button size="xs" onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
