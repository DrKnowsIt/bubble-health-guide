import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/utils/logger";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "drknowsit_install_dismissed_at";
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * Lightweight PWA install prompt — no service worker.
 * - Android Chrome / Edge: uses native beforeinstallprompt
 * - iOS Safari: shows manual "Add to Home Screen" instructions
 * Dismissible and snoozed for 7 days.
 */
export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show in iframe (Lovable preview)
    const inIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();
    if (inIframe) return;

    // Already installed?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore — iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Wait for cookie consent to be handled first (avoids stacking banners)
    const cookieConsent = localStorage.getItem('drknowsit_cookie_consent');
    if (!cookieConsent) return;

    // Recently dismissed?
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
      logger.debug("PWA install prompt available");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS has no beforeinstallprompt — show manual hint after a delay
    if (isIos) {
      const t = setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    logger.debug("PWA install outcome:", outcome);
    setDeferredPrompt(null);
    setVisible(false);
    if (outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-elevated backdrop-blur-md md:left-auto md:right-4 mb-[env(safe-area-inset-bottom)]"
      role="dialog"
      aria-label="Install app"
    >
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Install DrKnowsIt</p>
          {showIosHint ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Tap{" "}
              <Share className="inline h-3 w-3 align-text-bottom" />{" "}
              then{" "}
              <span className="font-medium">Add to Home Screen</span>{" "}
              <Plus className="inline h-3 w-3 align-text-bottom" />
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Add to your home screen for the full app experience — works offline-ready & loads instantly.
            </p>
          )}
          {!showIosHint && deferredPrompt && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="mt-3 h-8 rounded-full"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Install app
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
