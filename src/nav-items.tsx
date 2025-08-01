import { HomeIcon, Type, FileText, DollarSign, Shield, AlertTriangle, User, LogIn, HelpCircle, Settings as SettingsIcon } from "lucide-react";
import Index from "./pages/Index.jsx";
import Auth from "./pages/Auth.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import Settings from "./pages/Settings.jsx";
import MedicalDisclaimer from "./pages/MedicalDisclaimer.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";
import UserAgreement from "./pages/UserAgreement.jsx";
import Pricing from "./pages/Pricing.jsx";
import FAQ from "./pages/FAQ.jsx";
import NotFound from "./pages/NotFound.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
    protected: false,
  },
  {
    title: "FAQ",
    to: "/faq",
    icon: <HelpCircle className="h-4 w-4" />,
    page: <FAQ />,
    protected: false,
  },
  {
    title: "Auth",
    to: "/auth",
    icon: <LogIn className="h-4 w-4" />,
    page: <Auth />,
    protected: false,
  },
  {
    title: "Dashboard",
    to: "/dashboard",
    icon: <User className="h-4 w-4" />,
    page: <UserDashboard />,
    protected: true,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Settings />,
    protected: true,
  },
  {
    title: "Medical Disclaimer",
    to: "/medical-disclaimer",
    icon: <AlertTriangle className="h-4 w-4" />,
    page: <MedicalDisclaimer />,
    protected: false,
  },
  {
    title: "Privacy Policy",
    to: "/privacy",
    icon: <Shield className="h-4 w-4" />,
    page: <PrivacyPolicy />,
    protected: false,
  },
  {
    title: "Terms of Service",
    to: "/terms",
    icon: <FileText className="h-4 w-4" />,
    page: <TermsOfService />,
    protected: false,
  },
  {
    title: "User Agreement",
    to: "/user-agreement", 
    icon: <FileText className="h-4 w-4" />,
    page: <UserAgreement />,
    protected: false,
  },
  {
    title: "Pricing",
    to: "/pricing",
    icon: <DollarSign className="h-4 w-4" />,
    page: <Pricing />,
    protected: false,
  },
  {
    title: "Not Found",
    to: "*",
    icon: <Type className="h-4 w-4" />,
    page: <NotFound />,
    protected: false,
  },
];