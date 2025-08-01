import { Check, ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Patient } from '@/hooks/usePatients';

interface PatientDropdownProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PatientDropdown = ({
  patients = [],
  selectedPatient,
  onPatientSelect,
  open,
  onOpenChange,
}: PatientDropdownProps) => {
  // Ensure patients is always an array and each patient has required fields
  const safePatients = Array.isArray(patients) 
    ? patients.filter(patient => 
        patient && 
        patient.id && 
        patient.first_name && 
        patient.last_name
      )
    : [];

  const getPatientDisplayName = (patient: Patient) => {
    if (!patient || !patient.first_name || !patient.last_name) {
      return 'Unknown Patient';
    }
    const name = `${patient.first_name} ${patient.last_name}`;
    if (patient.is_primary) {
      return `${name} (Primary)`;
    }
    return `${name} (${patient.relationship || 'Unknown'})`;
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {selectedPatient ? (
              <span className="truncate">
                {getPatientDisplayName(selectedPatient)}
              </span>
            ) : (
              <span className="text-muted-foreground">Select patient...</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        {safePatients.length > 0 ? (
          <Command>
            <CommandInput placeholder="Search patients..." />
            <CommandEmpty>No patients found.</CommandEmpty>
            <CommandGroup>
              {safePatients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={`${patient.first_name} ${patient.last_name}`}
                  onSelect={() => {
                    onPatientSelect(patient.id === selectedPatient?.id ? null : patient);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {getPatientDisplayName(patient)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      DOB: {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'Not provided'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No patients available
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};