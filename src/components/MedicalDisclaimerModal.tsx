import { useState } from "react";
import { AlertTriangle, Shield, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MedicalDisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const MedicalDisclaimerModal = ({ isOpen, onAccept, onDecline }: MedicalDisclaimerModalProps) => {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acknowledgeNotMedical, setAcknowledgeNotMedical] = useState(false);
  const [acknowledgeEmergency, setAcknowledgeEmergency] = useState(false);
  const [acknowledgePersonalResponsibility, setAcknowledgePersonalResponsibility] = useState(false);

  const allAcknowledged = hasReadTerms && acknowledgeNotMedical && acknowledgeEmergency && acknowledgePersonalResponsibility;

  const handleAccept = () => {
    if (allAcknowledged) {
      localStorage.setItem('medical_disclaimer_accepted', 'true');
      localStorage.setItem('medical_disclaimer_date', new Date().toISOString());
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center text-xl font-bold text-destructive">
            <AlertTriangle className="mr-3 h-6 w-6" />
            CRITICAL MEDICAL DISCLAIMER & USER AGREEMENT
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* Main Warning */}
            <div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-4">
              <h3 className="font-bold text-destructive mb-3 text-lg">
                ⚠️ STOP AND READ THIS CAREFULLY
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-destructive">
                  DrKnowItAll is NOT a doctor, medical professional, or healthcare provider.
                </p>
                <p className="text-destructive">
                  This AI system provides general health information for educational purposes only 
                  and cannot replace professional medical advice, diagnosis, or treatment.
                </p>
              </div>
            </div>

            {/* What DrKnowItAll IS NOT */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-3">DrKnowItAll CANNOT and WILL NOT:</h4>
              <ul className="list-disc list-inside text-red-700 space-y-1 text-sm">
                <li>Diagnose medical conditions or diseases</li>
                <li>Prescribe medications or treatments</li>
                <li>Provide emergency medical assistance</li>
                <li>Replace consultations with healthcare professionals</li>
                <li>Guarantee accuracy of health information provided</li>
                <li>Be held responsible for your health decisions</li>
              </ul>
            </div>

            {/* Emergency Warning */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <h4 className="font-bold text-orange-800 mb-3 flex items-center">
                🚨 MEDICAL EMERGENCIES
              </h4>
              <p className="text-orange-700 font-semibold text-sm mb-2">
                If you are experiencing a medical emergency, DO NOT use this service.
              </p>
              <div className="bg-orange-100 p-3 rounded text-orange-800 text-sm">
                <p className="font-bold">CALL 911 IMMEDIATELY if you have:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Chest pain or difficulty breathing</li>
                  <li>Severe allergic reactions</li>
                  <li>Signs of stroke or heart attack</li>
                  <li>Severe bleeding or trauma</li>
                  <li>Thoughts of suicide or self-harm</li>
                  <li>Any life-threatening emergency</li>
                </ul>
              </div>
            </div>

            {/* Legal Protection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center">
                <Shield className="mr-2 h-4 w-4" />
                Legal Protection & Liability
              </h4>
              <div className="text-blue-700 text-sm space-y-2">
                <p>
                  <strong>YOU ASSUME ALL RISK:</strong> By using DrKnowItAll, you accept full 
                  responsibility for any health decisions or actions you take.
                </p>
                <p>
                  <strong>NO LIABILITY:</strong> DrKnowItAll, its creators, and operators are not 
                  liable for any health outcomes, medical decisions, or consequences.
                </p>
                <p>
                  <strong>AI LIMITATIONS:</strong> AI responses may contain errors, omissions, or 
                  inaccuracies. Always verify with healthcare professionals.
                </p>
              </div>
            </div>

            {/* Data Collection Notice */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-bold text-purple-800 mb-3">Data Collection for Medical Research</h4>
              <p className="text-purple-700 text-sm mb-2">
                We collect anonymized health conversation data to discover medical patterns that 
                traditional research might miss. This helps advance medical knowledge and early disease detection.
              </p>
              <p className="text-purple-600 text-xs">
                All personal identifiers are removed to protect your privacy while contributing to medical breakthroughs.
              </p>
            </div>

            {/* User Acknowledgments */}
            <div className="space-y-4">
              <h4 className="font-bold text-foreground">Required Acknowledgments:</h4>
              
              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <Checkbox 
                    checked={acknowledgeNotMedical}
                    onCheckedChange={(checked) => setAcknowledgeNotMedical(checked === true)}
                    className="mt-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    I understand that DrKnowItAll is <strong>NOT a medical professional</strong> and 
                    cannot provide medical diagnosis, treatment, or prescriptions.
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <Checkbox 
                    checked={acknowledgeEmergency}
                    onCheckedChange={(checked) => setAcknowledgeEmergency(checked === true)}
                    className="mt-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    I will <strong>NOT use this service for medical emergencies</strong> and will 
                    call 911 or emergency services for urgent medical situations.
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <Checkbox 
                    checked={acknowledgePersonalResponsibility}
                    onCheckedChange={(checked) => setAcknowledgePersonalResponsibility(checked === true)}
                    className="mt-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    I accept <strong>full personal responsibility</strong> for any health decisions 
                    I make and will consult healthcare professionals for medical advice.
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <Checkbox 
                    checked={hasReadTerms}
                    onCheckedChange={(checked) => setHasReadTerms(checked === true)}
                    className="mt-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    I have read and agree to the <strong>Terms of Service</strong> and 
                    <strong> Privacy Policy</strong>, including data collection for medical research.
                  </span>
                </label>
              </div>
            </div>

            {/* Final Warning */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <p className="text-yellow-800 font-semibold text-sm text-center">
                By proceeding, you confirm that you understand these limitations and will use 
                DrKnowItAll responsibly as an educational tool only.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t p-6">
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={onDecline}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              I Do Not Agree - Exit
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={!allAcknowledged}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              I Understand & Agree - Continue
            </Button>
          </div>
          {!allAcknowledged && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Please read and acknowledge all requirements above to continue.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};