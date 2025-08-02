import { Check, ChevronDown, User as UserIcon } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/hooks/useUsers';

interface UserDropdownProps {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDropdown = ({
  users,
  selectedUser,
  onUserSelect,
  open,
  onOpenChange,
}: UserDropdownProps) => {
  const getUserDisplayName = (user: User) => {
    const name = `${user.first_name} ${user.last_name}`;
    if (user.is_primary) {
      return `${name} (Primary)`;
    }
    return `${name} (${user.relationship})`;
  };

  const getUserValue = (user: User) => {
    return `${user.id}-${user.first_name}-${user.last_name}`;
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
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span className="truncate">{getUserDisplayName(selectedUser)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span className="text-muted-foreground">Select user...</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={getUserValue(user)}
                  onSelect={() => {
                    onUserSelect(user.id === selectedUser?.id ? null : user);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.first_name} {user.last_name}
                      </span>
                      {user.date_of_birth && (
                        <span className="text-xs text-muted-foreground">
                          Born: {new Date(user.date_of_birth).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {user.is_primary ? (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {user.relationship}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {users.length === 0 && (
              <CommandEmpty>
                <div className="text-center py-6">
                  <UserIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium text-lg mb-2">No users added</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first user to get started
                  </p>
                </div>
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Backward compatibility
export const PatientDropdown = UserDropdown;