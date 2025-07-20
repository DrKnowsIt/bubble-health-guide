import { Stethoscope, Heart, Shield, Mail, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t border-border">
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
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-smooth">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-muted-foreground hover:text-primary transition-smooth">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#chat" className="text-muted-foreground hover:text-primary transition-smooth">
                    Try DrKnowsIt
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                    API Access
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Support</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                    Medical Disclaimers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Contact</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>support@drknowsit.ai</span>
                </li>
                <li className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>1-800-DRKNOWSIT</span>
                </li>
                <li className="flex items-center space-x-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Enterprise Security</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-muted-foreground">
              © 2024 DrKnowsIt. All rights reserved.
            </div>
            
            {/* Important Medical Disclaimer */}
            <div className="flex items-center space-x-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-1">
              <Heart className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-warning">
                Not a substitute for professional medical advice
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};