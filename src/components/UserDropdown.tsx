import { Check, ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Patient } from '@/hooks/usePatients';

interface UserDropdownProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDropdown = ({
  patients = [],
  selectedPatient,
  onPatientSelect,
  open,
  onOpenChange,
}: UserDropdownProps) => {
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
      return 'Unknown User';
    }
    const name = `${patient.first_name} ${patient.last_name}`;
    if (patient.is_primary) {
      return `${name} (Primary)`;
    }
    return `${name} (${patient.relationship || 'Unknown'})`;
  };

  const getPatientValue = (patient: Patient) => {
    if (!patient || !patient.first_name || !patient.last_name) {
      return `unknown-${patient?.id || 'user'}`;
    }
    return `${patient.first_name.trim()} ${patient.last_name.trim()}`.toLowerCase();
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
              <span className="text-muted-foreground">Select user...</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        {safePatients.length > 0 ? (
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
              {safePatients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={getPatientValue(patient)}
                  onSelect={(value) => {
                    if (patient && patient.id) {
                      onPatientSelect(patient.id === selectedPatient?.id ? null : patient);
                      onOpenChange(false);
                    }
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
            </CommandList>
          </Command>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No users available
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// Backward compatibility export
export const PatientDropdown = UserDropdown;