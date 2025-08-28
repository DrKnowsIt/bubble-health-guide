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
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-center">
            Legal Agreement Required
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Please read all sections completely and scroll to the bottom of each tab to continue
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs defaultValue="medical-disclaimer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="medical-disclaimer" className="text-xs">
                Medical Disclaimer
                {scrolledTabs.has('medical-disclaimer') && (
                  <span className="ml-2 text-green-500">✓</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="user-agreement" className="text-xs">
                User Agreement
                {scrolledTabs.has('user-agreement') && (
                  <span className="ml-2 text-green-500">✓</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="terms-of-service" className="text-xs">
                Terms of Service
                {scrolledTabs.has('terms-of-service') && (
                  <span className="ml-2 text-green-500">✓</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="medical-disclaimer" className="mt-4">
              <ScrollArea 
                className="h-[500px] w-full rounded-md border p-4"
                ref={(el) => scrollRefs.current['medical-disclaimer'] = el}
                onScrollCapture={() => handleScroll('medical-disclaimer')}
              >
                <div className="space-y-6">
                  <Card className="border-destructive/20">
                    <CardHeader>
                      <CardTitle className="text-destructive flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span>CRITICAL: NOT A MEDICAL SERVICE</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-destructive/10 p-6 rounded-lg space-y-4">
                        <p className="text-destructive font-bold text-lg">
                          DrKnowsIt is NOT a substitute for professional medical care, diagnosis, or treatment.
                        </p>
                        <ul className="list-disc list-inside text-destructive space-y-2">
                          <li>DrKnowsIt cannot diagnose medical conditions</li>
                          <li>DrKnowsIt cannot prescribe medications or treatments</li>
                          <li>DrKnowsIt cannot provide emergency medical care</li>
                          <li>DrKnowsIt responses are for educational purposes only</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-warning/20">
                    <CardHeader>
                      <CardTitle className="text-warning">Emergency Situations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-warning/10 p-6 rounded-lg space-y-4">
                        <p className="text-warning font-bold">
                          🚨 If you are experiencing a medical emergency, do NOT use DrKnowsIt.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-foreground">Call Emergency Services:</h3>
                            <div className="flex items-center space-x-2 text-destructive font-bold">
                              <Phone className="h-4 w-4" />
                              <span>911 (US) or your local emergency number</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-foreground">Emergency Signs Include:</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Chest pain or difficulty breathing</li>
                              <li>• Severe injuries or bleeding</li>
                              <li>• Loss of consciousness</li>
                              <li>• Suicidal thoughts</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>AI Limitations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Our AI technology, while advanced, has important limitations you should understand:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li><strong>No physical examination:</strong> Cannot see, touch, or physically examine you</li>
                        <li><strong>Limited context:</strong> Only knows information you provide in conversations</li>
                        <li><strong>General information:</strong> Responses are based on general medical knowledge</li>
                        <li><strong>No real-time updates:</strong> May not have the latest medical research or guidelines</li>
                        <li><strong>Pattern recognition:</strong> Works on patterns, not individual medical assessment</li>
                        <li><strong>No liability:</strong> AI responses are suggestions, not medical recommendations</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Your Responsibility</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">By using DrKnowsIt, you acknowledge that:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li>You understand DrKnowsIt is for educational purposes only</li>
                        <li>You will not rely solely on DrKnowsIt for medical decisions</li>
                        <li>You will consult healthcare professionals for medical advice</li>
                        <li>You will seek immediate medical care for emergencies</li>
                        <li>You understand AI responses are not medical diagnoses</li>
                        <li>You will use DrKnowsIt as a supplementary tool, not a replacement for medical care</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="user-agreement" className="mt-4">
              <ScrollArea 
                className="h-[500px] w-full rounded-md border p-4"
                ref={(el) => scrollRefs.current['user-agreement'] = el}
                onScrollCapture={() => handleScroll('user-agreement')}
              >
                <div className="space-y-6">
                  <Card className="border-destructive/50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-destructive">
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        CRITICAL LEGAL NOTICE - READ CAREFULLY
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-destructive/10 p-4 rounded-lg mb-4">
                        <p className="text-destructive font-bold mb-2">
                          BY USING DRKNOWSIT, YOU AGREE TO ALL TERMS AND ASSUME ALL RISKS
                        </p>
                        <p className="text-destructive text-sm">
                          This agreement contains important legal provisions that limit our liability and 
                          require you to take responsibility for your health decisions. If you do not agree 
                          to these terms, do not use this service.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Scale className="mr-2 h-5 w-5" />
                        Limitation of Liability and Legal Protection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg">
                          <h4 className="font-bold text-red-800 mb-2">MAXIMUM LIABILITY LIMITATION</h4>
                          <p className="text-red-700 text-sm">
                            TO THE FULLEST EXTENT PERMITTED BY LAW, DRKNOWSIT AND ITS CREATORS, 
                            OPERATORS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY DAMAGES 
                            OF ANY KIND ARISING FROM YOUR USE OF THIS SERVICE.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">This includes but is not limited to:</h4>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Medical outcomes or health consequences</li>
                            <li>Decisions made based on AI responses</li>
                            <li>Delays in seeking professional medical care</li>
                            <li>Misdiagnosis or missed diagnosis due to AI limitations</li>
                            <li>Adverse reactions or treatment complications</li>
                            <li>Financial losses related to health decisions</li>
                            <li>Emotional distress or psychological harm</li>
                            <li>Data loss or security breaches</li>
                            <li>Service interruptions or unavailability</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="mr-2 h-5 w-5" />
                        Data Collection for Medical Research
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                          <h4 className="font-semibold text-purple-800 mb-2">Research Purpose</h4>
                          <p className="text-purple-700 text-sm">
                            We collect and analyze anonymized health conversation data to discover medical 
                            patterns and correlations that traditional research methods and individual 
                            healthcare providers might not identify.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Privacy protections:</h4>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>All names, addresses, and contact information are completely removed</li>
                            <li>Data is aggregated to prevent individual identification</li>
                            <li>Multiple layers of anonymization protect your privacy</li>
                            <li>Research data cannot be traced back to individual users</li>
                            <li>We comply with all applicable privacy and research regulations</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="terms-of-service" className="mt-4">
              <ScrollArea 
                className="h-[500px] w-full rounded-md border p-4"
                ref={(el) => scrollRefs.current['terms-of-service'] = el}
                onScrollCapture={() => handleScroll('terms-of-service')}
              >
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Acceptance of Terms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        By accessing and using DrKnowsIt ("Service"), you accept and agree to be bound by the 
                        terms and provision of this agreement. If you do not agree to abide by the above, 
                        please do not use this service.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Responsibilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">Account Security</h3>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Maintain the confidentiality of your account credentials</li>
                            <li>Notify us immediately of any unauthorized account use</li>
                            <li>Use strong, unique passwords for your account</li>
                            <li>Enable two-factor authentication when available</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">Prohibited Activities</h3>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Using the service for any illegal or unauthorized purpose</li>
                            <li>Attempting to access other users' accounts or data</li>
                            <li>Uploading malicious code or attempting to harm the system</li>
                            <li>Using the service to provide medical advice to others</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Limitation of Liability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-muted-foreground font-medium">
                          To the maximum extent permitted by law, DrKnowsIt shall not be liable for any damages 
                          arising from your use of the service.
                        </p>
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li>We provide the service "as is" without warranties of any kind</li>
                        <li>We do not guarantee the accuracy or completeness of AI responses</li>
                        <li>You assume all risks associated with using health guidance information</li>
                        <li>Our liability is limited to the amount you paid for the service</li>
                        <li>We are not responsible for decisions made based on AI recommendations</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Data and Privacy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Your privacy is important to us. Please review our Privacy Policy for detailed 
                        information about how we collect, use, and protect your data.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li>We follow enterprise-grade security and data protection standards</li>
                        <li>Your health data is encrypted and securely stored</li>
                        <li>You have rights to access, correct, and delete your data</li>
                        <li>We do not sell your personal information to third parties</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        If you have any questions about these Terms of Service, please contact us:
                      </p>
                      <div className="space-y-2 text-muted-foreground">
                        <p><strong>Email:</strong> legal@drknowit.com</p>
                        <p><strong>Phone:</strong> 919-616-6125</p>
                        <p><strong>Mail:</strong> DrKnowsIt Legal Department<br />123 Health Street<br />Medical City, MC 12345</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {allTabsScrolled 
                ? "✓ All sections completed - you may now accept or disagree" 
                : `Please scroll to the bottom of all tabs (${scrolledTabs.size}/${tabs.length} completed)`
              }
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="destructive" 
                onClick={handleDisagree}
                disabled={isUpdating}
              >
                Disagree & Sign Out
              </Button>
              <Button 
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