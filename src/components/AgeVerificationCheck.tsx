import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield } from 'lucide-react';

const AGE_VERIFICATION_KEY = 'drknowsit_age_verified';

export const AgeVerificationCheck = () => {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem(AGE_VERIFICATION_KEY);
    if (!verified) {
      setShowDialog(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem(AGE_VERIFICATION_KEY, JSON.stringify({
      verified: true,
      timestamp: new Date().toISOString(),
    }));
    setShowDialog(false);
  };

  const handleDecline = () => {
    // Redirect to a safe page or show message
    window.location.href = 'https://www.google.com';
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">Age Verification Required</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            DrKnowsIt provides health information and guidance. By continuing, you confirm that:
          </AlertDialogDescription>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-3 space-y-1">
            <li>You are at least 18 years of age</li>
            <li>You understand this is for informational purposes only</li>
            <li>You will consult healthcare professionals for medical decisions</li>
          </ul>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={handleDecline}>
            I am under 18
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            I confirm I am 18+
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
