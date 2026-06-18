import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { LegalAgreementModal } from "./components/modals/LegalAgreementModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useLocation } from "react-router-dom";
import { useAuthRedirect } from "./hooks/useAuthRedirect";
import { useAuth } from "./hooks/useAuth";
import { CookieConsent } from "./components/CookieConsent";
import { AgeVerificationCheck } from "./components/AgeVerificationCheck";

// Import pages directly
import Index from "./pages/Index";
const Auth = lazy(() => import("./pages/Auth"));
import UserDashboard from "./pages/UserDashboard";
import Settings from "./pages/Settings";
import MedicalDisclaimer from "./pages/MedicalDisclaimer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import UserAgreement from "./pages/UserAgreement";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

import { SessionExtensionPrompt } from "./components/SessionExtensionPrompt";

const App = () => {
  // Global auth redirect logic
  useAuthRedirect();
  const { showLegalModal, setShowLegalModal } = useAuth();
  const location = useLocation();

  return (
    <TooltipProvider>
      <Sonner />
      <Toaster />
      <ErrorBoundary scope="route" resetKey={location.pathname}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/auth" element={<Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p>Loading...</p></div>}><Auth /></Suspense>} />
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/medical-disclaimer" element={<MedicalDisclaimer />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/user-agreement" element={<UserAgreement />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
      <LegalAgreementModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />
      <SessionExtensionPrompt />
      <CookieConsent />
      <AgeVerificationCheck />
    </TooltipProvider>
  );
};

export default App;
