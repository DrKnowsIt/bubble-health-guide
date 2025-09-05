import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthDebugPanel } from "./components/AuthDebugPanel";
import { LegalAgreementModal } from "./components/LegalAgreementModal";
import { useAuthRedirect } from "./hooks/useAuthRedirect";
import { useAuth } from "./hooks/useAuth";

// Import pages directly
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import Settings from "./pages/Settings";
import MedicalDisclaimer from "./pages/MedicalDisclaimer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import UserAgreement from "./pages/UserAgreement";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";

const App = () => {
  // Global auth redirect logic
  useAuthRedirect();
  const { showLegalModal, setShowLegalModal } = useAuth();

  return (
    <TooltipProvider>
      <Sonner />
      <Toaster />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/medical-disclaimer" element={<MedicalDisclaimer />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/user-agreement" element={<UserAgreement />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AuthDebugPanel />
      <LegalAgreementModal 
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />
    </TooltipProvider>
  );
};

export default App;
