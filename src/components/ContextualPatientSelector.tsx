import { useState } from "react";
import { UserDropdown } from "@/components/UserDropdown";
import { Patient } from "@/hooks/usePatients";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextualPatientSelectorProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient | null) => void;
  hasAccess: boolean;
  className?: string;
  title?: string;
  description?: string;
}

export const ContextualPatientSelector = ({
  patients,
  selectedPatient,
  onPatientSelect,
  hasAccess,
  className,
  title = "User Selection",
  description = "Select a user to view their data"
}: ContextualPatientSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {!hasAccess && (
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Requires subscription</span>
          </div>
        )}
      </div>
      
      <div className={cn("max-w-xs", !hasAccess && "opacity-50 pointer-events-none")}>
        <UserDropdown
          patients={patients}
          selectedPatient={selectedPatient}
          onPatientSelect={hasAccess ? onPatientSelect : () => {}}
          open={hasAccess ? open : false}
          onOpenChange={hasAccess ? setOpen : () => {}}
        />
      </div>
      
      {hasAccess && !selectedPatient && patients.length > 0 && (
        <div className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 px-3 py-2 rounded-md border border-orange-200">
          Please select a user to view their data
        </div>
      )}
    </div>
  );
};