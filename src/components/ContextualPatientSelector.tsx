import { useState } from "react";
import { UserDropdown } from "@/components/UserDropdown";
import { User } from "@/hooks/useUsers";
import { Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextualUserSelectorProps {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User | null) => void;
  hasAccess: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

export const ContextualUserSelector = ({
  users,
  selectedUser,
  onUserSelect,
  hasAccess,
  loading = false,
  className,
  title = "User Selection",
  description = "Select a user to view their data"
}: ContextualUserSelectorProps) => {
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
        {loading ? (
          <div className="flex items-center gap-2 p-2 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading users...</span>
          </div>
        ) : (
          <UserDropdown
            users={users}
            selectedUser={selectedUser}
            onUserSelect={hasAccess ? onUserSelect : () => {}}
            open={hasAccess ? open : false}
            onOpenChange={hasAccess ? setOpen : () => {}}
          />
        )}
      </div>
      
      {hasAccess && !selectedUser && users.length > 0 && (
        <div className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 px-3 py-2 rounded-md border border-orange-200">
          Please select a user to view their data
        </div>
      )}
    </div>
  );
};

// Backward compatibility
export const ContextualPatientSelector = ContextualUserSelector;