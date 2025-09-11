import { AlertTriangle } from "lucide-react";

interface HealthTopicsDisclaimerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const HealthTopicsDisclaimer = ({ size = 'small', className = '' }: HealthTopicsDisclaimerProps) => {
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-2', 
    large: 'text-base px-4 py-3'
  };

  return (
    <div className={`bg-warning/10 border border-warning/20 rounded-lg flex items-start space-x-2 ${sizeClasses[size]} ${className}`}>
      <AlertTriangle className="h-3 w-3 text-warning mt-0.5 flex-shrink-0" />
      <div className="text-warning text-left">
        <span className="font-medium">Health Topics for Discussion:</span>
        <span className="ml-1">Not medical diagnoses. Consult your doctor for professional evaluation.</span>
      </div>
    </div>
  );
};