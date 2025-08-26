import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthDebugPanel } from "./components/AuthDebugPanel";
import { navItems } from "./nav-items";
import { useAuthRedirect } from "./hooks/useAuthRedirect";

const App = () => {
  // Global auth redirect logic
  useAuthRedirect();

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
    </TooltipProvider>
  );
};

export default App;
