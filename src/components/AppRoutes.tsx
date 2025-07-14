import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import MedicalDisclaimer from "@/pages/MedicalDisclaimer";
import Pricing from "@/pages/Pricing";
import NotFound from "@/pages/NotFound";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/medical-disclaimer" element={<MedicalDisclaimer />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;