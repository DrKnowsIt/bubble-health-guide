import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, Scale, Users, FileText, Phone, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

interface LegalAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalAgreementModal = ({ isOpen, onClose }: LegalAgreementModalProps) => {
  const { signOut } = useAuth();
  const { updateLegalAgreementStatus } = useProfile();
  const [scrolledTabs, setScrolledTabs] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const tabs = ['medical-disclaimer', 'user-agreement', 'terms-of-service'];
  const allTabsScrolled = tabs.every(tab => scrolledTabs.has(tab));

  useEffect(() => {
    // Reset scroll tracking when modal opens
    if (isOpen) {
      setScrolledTabs(new Set());
    }
  }, [isOpen]);

  const handleScroll = (tabId: string) => {
    const element = scrollRefs.current[tabId];
    if (element) {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const threshold = 10; // Allow for small scroll differences
      
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        setScrolledTabs(prev => new Set([...prev, tabId]));
      }
    }
  };

  const handleAccept = async () => {
    try {
      setIsUpdating(true);
      await updateLegalAgreementStatus(true);
      toast({
        title: "Agreement Accepted",
        description: "Thank you for accepting the terms. You can now use DrKnowsIt.",
      });
      onClose();
    } catch (error) {
      console.error('Failed to update legal agreement status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to save your agreement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisagree = async () => {
    try {
      toast({
        title: "Terms Declined",
        description: "You have declined the terms. You will be signed out.",
        variant: "destructive",
      });
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg font-semibold text-center">
            Legal Agreement Required
          </DialogTitle>
          <p className="text-muted-foreground text-center text-sm">
            Please read all sections completely and scroll to the bottom of each tab to continue
          </p>
        </DialogHeader>

        <div className="px-4 pb-4">
          <Tabs defaultValue="medical-disclaimer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="medical-disclaimer" className="text-xs">
                Medical Disclaimer
                {scrolledTabs.has('medical-disclaimer') && (
                  <span className="ml-1 text-green-500 text-xs">✓</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="user-agreement" className="text-xs">
                User Agreement
                {scrolledTabs.has('user-agreement') && (
                  <span className="ml-1 text-green-500 text-xs">✓</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="terms-of-service" className="text-xs">
                Terms of Service
                {scrolledTabs.has('terms-of-service') && (
                  <span className="ml-1 text-green-500 text-xs">✓</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="medical-disclaimer" className="mt-3">
              <ScrollArea 
                className="h-[320px] w-full rounded-md border p-3"
                ref={(el) => scrollRefs.current['medical-disclaimer'] = el}
                onScrollCapture={() => handleScroll('medical-disclaimer')}
              >
                <div className="space-y-4 text-sm">
                  <div className="border-l-4 border-destructive pl-4">
                    <h3 className="font-semibold text-destructive mb-2 text-sm">
                      ⚠️ NOT A MEDICAL SERVICE
                    </h3>
                    <p className="text-destructive mb-2 text-xs font-medium">
                      DrKnowsIt is NOT a substitute for professional medical care, diagnosis, or treatment.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Cannot diagnose medical conditions</li>
                      <li>• Cannot prescribe medications or treatments</li>
                      <li>• Cannot provide emergency medical care</li>
                      <li>• Responses are for educational purposes only</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-4">
                    <h3 className="font-semibold text-orange-600 mb-2 text-sm">
                      🚨 Emergency Situations
                    </h3>
                    <p className="text-orange-600 mb-2 text-xs font-medium">
                      If you are experiencing a medical emergency, do NOT use DrKnowsIt.
                    </p>
                    <div className="text-xs space-y-2">
                      <p><strong>Call Emergency Services: 911 (US) or your local emergency number</strong></p>
                      <p className="text-muted-foreground">Emergency examples: chest pain, difficulty breathing, severe injuries, loss of consciousness, suicidal thoughts</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">AI Limitations</h3>
                    <p className="text-muted-foreground mb-2 text-xs">
                      Our AI technology has important limitations:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• No physical examination capability</li>
                      <li>• Limited to information you provide</li>
                      <li>• Based on general medical knowledge</li>
                      <li>• May not have latest research</li>
                      <li>• Provides suggestions, not medical recommendations</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Your Responsibility</h3>
                    <p className="text-muted-foreground mb-2 text-xs">By using DrKnowsIt, you acknowledge:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• You understand this is for educational purposes only</li>
                      <li>• You will not rely solely on DrKnowsIt for medical decisions</li>
                      <li>• You will consult healthcare professionals for medical advice</li>
                      <li>• You will seek immediate medical care for emergencies</li>
                      <li>• AI responses are not medical diagnoses</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="user-agreement" className="mt-3">
              <ScrollArea 
                className="h-[320px] w-full rounded-md border p-3"
                ref={(el) => scrollRefs.current['user-agreement'] = el}
                onScrollCapture={() => handleScroll('user-agreement')}
              >
                <div className="space-y-4 text-sm">
                  <div className="border-l-4 border-destructive pl-4">
                    <h3 className="font-semibold text-destructive mb-2 text-sm">
                      CRITICAL LEGAL NOTICE
                    </h3>
                    <p className="text-destructive mb-2 text-xs font-medium">
                      BY USING DRKNOWSIT, YOU AGREE TO ALL TERMS AND ASSUME ALL RISKS
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This agreement limits our liability and requires you to take responsibility for health decisions.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Limitation of Liability</h3>
                    <p className="text-xs text-destructive font-medium mb-2">
                      TO THE FULLEST EXTENT PERMITTED BY LAW, DRKNOWSIT SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM YOUR USE OF THIS SERVICE.
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">This includes but is not limited to:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Medical outcomes or health consequences</li>
                      <li>• Decisions made based on AI responses</li>
                      <li>• Delays in seeking professional medical care</li>
                      <li>• Misdiagnosis or missed diagnosis</li>
                      <li>• Adverse reactions or complications</li>
                      <li>• Financial losses related to health decisions</li>
                      <li>• Emotional distress or psychological harm</li>
                      <li>• Data loss or security breaches</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Data Collection for Medical Research</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      We collect anonymized health conversation data to discover medical patterns and correlations.
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">Privacy protections:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• All personal information completely removed</li>
                      <li>• Data aggregated to prevent identification</li>
                      <li>• Multiple anonymization layers protect privacy</li>
                      <li>• Research data cannot be traced back to users</li>
                      <li>• Compliance with privacy regulations</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="terms-of-service" className="mt-3">
              <ScrollArea 
                className="h-[320px] w-full rounded-md border p-3"
                ref={(el) => scrollRefs.current['terms-of-service'] = el}
                onScrollCapture={() => handleScroll('terms-of-service')}
              >
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Acceptance of Terms</h3>
                    <p className="text-xs text-muted-foreground">
                      By accessing DrKnowsIt, you agree to be bound by these terms. If you disagree, do not use this service.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">User Responsibilities</h3>
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-xs mb-1">Account Security</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Maintain credential confidentiality</li>
                          <li>• Report unauthorized access immediately</li>
                          <li>• Use strong, unique passwords</li>
                          <li>• Enable two-factor authentication when available</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-xs mb-1">Prohibited Activities</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• No illegal or unauthorized use</li>
                          <li>• No accessing other users' accounts</li>
                          <li>• No uploading malicious code</li>
                          <li>• No providing medical advice to others</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Service Limitations</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      To the maximum extent permitted by law, DrKnowsIt shall not be liable for damages arising from service use.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Service provided "as is" without warranties</li>
                      <li>• No guarantee of AI response accuracy</li>
                      <li>• You assume all risks with health guidance</li>
                      <li>• Liability limited to amount paid for service</li>
                      <li>• Not responsible for AI-based decisions</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Data and Privacy</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Your privacy is important. Please review our Privacy Policy for data handling details.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Enterprise-grade security standards</li>
                      <li>• Health data encrypted and secure</li>
                      <li>• Rights to access, correct, delete data</li>
                      <li>• No selling personal information</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Contact Information</h3>
                    <p className="text-xs text-muted-foreground mb-2">Questions about Terms of Service:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Email: legal@drknowit.com</p>
                      <p>Phone: 919-616-6125</p>
                      <p>Mail: DrKnowsIt Legal Department, 123 Health Street, Medical City, MC 12345</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center mt-4 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              {allTabsScrolled 
                ? "✓ All sections completed - you may now accept or disagree" 
                : `Please scroll to the bottom of all tabs (${scrolledTabs.size}/${tabs.length} completed)`
              }
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDisagree}
                disabled={isUpdating}
              >
                Disagree & Sign Out
              </Button>
              <Button 
                size="sm"
                onClick={handleAccept} 
                disabled={!allTabsScrolled || isUpdating}
              >
                {isUpdating ? "Accepting..." : "Accept & Continue"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};