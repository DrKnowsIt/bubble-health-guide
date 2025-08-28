import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthDebugPanel } from "./components/AuthDebugPanel";
import { LegalAgreementModal } from "./components/LegalAgreementModal";
import { navItems } from "./nav-items";
import { useAuthRedirect } from "./hooks/useAuthRedirect";
import { useAuth } from "./hooks/useAuth";

const App = () => {
  // Global auth redirect logic
  useAuthRedirect();
  const { showLegalModal, setShowLegalModal } = useAuth();

  return (
    <TooltipProvider>
      <Sonner />
      <Toaster />
      <Routes>
        {navItems.map(({ to, page, protected: isProtected }) => (
          <Route 
            key={to} 
            path={to} 
            element={isProtected ? <ProtectedRoute>{page}</ProtectedRoute> : page} 
          />
        ))}
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
