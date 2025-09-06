import { Check, ChevronDown, User as UserIcon, Dog } from 'lucide-react';
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
import { User } from '@/hooks/optimized/useUsersQuery';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useNavigate } from 'react-router-dom';

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
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const getUserDisplayName = (user: User) => {
    const name = user.is_pet ? user.first_name : `${user.first_name} ${user.last_name}`;
    if (user.is_primary) {
      return `${name} (Primary)`;
    }
    if (user.is_pet && user.species) {
      return `${name} (${user.species})`;
    }
    return `${name} (${user.relationship})`;
  };

  const getUserValue = (user: User) => {
    return `${user.id}-${user.first_name}-${user.last_name}`;
  };

  const handleUserSelect = (user: User) => {
    // If user is not subscribed and trying to select a non-primary user
    if (!subscribed && !user.is_primary) {
      toast({
        title: 'Subscription Required',
        description: 'Family member management is available for Basic and Pro subscribers. Manage multiple family members and pets in one place.',
        action: (
          <ToastAction altText="View pricing" onClick={() => navigate('/pricing')}>
            View Pricing
          </ToastAction>
        ),
      });
      onOpenChange(false);
      return;
    }

    onUserSelect(user.id === selectedUser?.id ? null : user);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-[2.5rem] bg-background"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedUser.is_pet ? (
                <Dog className="h-4 w-4 flex-shrink-0" />
              ) : (
                <UserIcon className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="truncate mobile-text-sm">{getUserDisplayName(selectedUser)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <UserIcon className="h-4 w-4 flex-shrink-0" />
              <span className="text-muted-foreground mobile-text-sm">Select user...</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border-border z-[200] shadow-lg" align="start">
        <Command className="bg-background">
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => {
                const isRestricted = !subscribed && !user.is_primary;
                return (
                  <CommandItem
                    key={user.id}
                    value={getUserValue(user)}
                    onSelect={() => handleUserSelect(user)}
                    className={cn(
                      "min-h-[3rem] p-2",
                      isRestricted && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {user.is_pet ? (
                      <Dog className={cn(
                        "h-4 w-4 mr-2 flex-shrink-0",
                        isRestricted ? "text-muted-foreground/50" : "text-muted-foreground"
                      )} />
                    ) : (
                      <UserIcon className={cn(
                        "h-4 w-4 mr-2 flex-shrink-0",
                        isRestricted ? "text-muted-foreground/50" : "text-muted-foreground"
                      )} />
                    )}
                    <div className="flex items-center justify-between w-full min-w-0">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={cn(
                          "font-medium mobile-text-sm truncate",
                          isRestricted && "text-muted-foreground/50"
                        )}>
                          {user.is_pet ? user.first_name : `${user.first_name} ${user.last_name}`}
                        </span>
                        {user.date_of_birth && (
                          <span className={cn(
                            "mobile-text-xs text-muted-foreground truncate",
                            isRestricted && "text-muted-foreground/50"
                          )}>
                            Born: {new Date(user.date_of_birth).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {user.is_primary ? (
                          <Badge variant="default" className="mobile-text-xs">Primary</Badge>
                        ) : user.is_pet && user.species ? (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "mobile-text-xs capitalize max-w-[4rem] truncate",
                              isRestricted && "opacity-50"
                            )}
                          >
                            {user.species}
                          </Badge>
                        ) : (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "mobile-text-xs capitalize max-w-[4rem] truncate",
                              isRestricted && "opacity-50"
                            )}
                          >
                            {user.relationship}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
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