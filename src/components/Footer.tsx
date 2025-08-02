import { Stethoscope, Heart, Shield, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
export const Footer = () => {
  return <footer className="bg-muted/50 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bubble">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">DrKnowsIt</div>
                  <div className="text-xs text-muted-foreground">AI Medical Guidance</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empowering individuals with AI-powered medical guidance to make informed health decisions 
                and improve communication with healthcare providers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
               <ul className="space-y-3 text-sm">
                 <li>
                   <Link 
                     to="/#features" 
                     className="text-muted-foreground hover:text-primary transition-smooth"
                     onClick={(e) => {
                       const currentPath = window.location.pathname;
                       if (currentPath === '/') {
                         e.preventDefault();
                         document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                       }
                     }}
                   >
                     Features
                   </Link>
                 </li>
                 <li>
                   <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-smooth">
                     Pricing
                   </Link>
                 </li>
                 <li>
                   <Link to="/" className="text-muted-foreground hover:text-primary transition-smooth">
                     Try DrKnowsIt
                   </Link>
                 </li>
               </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Support</h3>
               <ul className="space-y-3 text-sm">
                 <li>
                   <Link to="/faq" className="text-muted-foreground hover:text-primary transition-smooth">
                     Help Center
                   </Link>
                 </li>
                 <li>
                   <Link to="/medical-disclaimer" className="text-muted-foreground hover:text-primary transition-smooth">
                     Medical Disclaimers
                   </Link>
                 </li>
                 <li>
                   <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-smooth">
                     Privacy Policy
                   </Link>
                 </li>
                 <li>
                   <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-smooth">
                     Terms of Service
                   </Link>
                 </li>
               </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Contact</h3>
               <ul className="space-y-3 text-sm">
                 <li className="flex items-center space-x-2">
                   <Mail className="h-4 w-4 text-muted-foreground" />
                   <a href="mailto:support@drknowit.com" className="text-muted-foreground hover:text-primary transition-smooth">
                     support@drknowit.com
                   </a>
                 </li>
                 <li className="flex items-center space-x-2">
                   <Phone className="h-4 w-4 text-muted-foreground" />
                   <a href="tel:+19196166125" className="text-muted-foreground hover:text-primary transition-smooth">
                     919-616-6125
                   </a>
                 </li>
                 <li className="flex items-center space-x-2 text-muted-foreground">
                   <Shield className="h-4 w-4" />
                   <span>Enterprise Security</span>
                 </li>
               </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section - Mobile optimized */}
        <div className="border-t border-border py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-3 lg:space-y-0 gap-4">
            <div className="mobile-text-sm text-muted-foreground text-center lg:text-left">
              © 2025 DrKnowsIt. All rights reserved.
            </div>
            
            {/* Important Medical Disclaimer - Mobile responsive */}
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 max-w-full">
              <Heart className="h-4 w-4 text-warning flex-shrink-0" />
              <span className="mobile-text-xs font-medium text-warning text-center lg:text-left break-words">
                Not a substitute for professional medical advice
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};