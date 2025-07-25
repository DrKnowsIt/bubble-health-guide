import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { navItems } from "./nav-items";

const App = () => (
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
  </TooltipProvider>
);

export default App;
