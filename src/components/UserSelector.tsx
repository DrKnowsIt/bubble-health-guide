import { useState } from 'react';
import { Plus, User as UserIcon, Users, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers, User, CreateUserData } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserSelectorProps {
  onUserSelected?: (user: User | null) => void;
  className?: string;
}

export const UserSelector = ({ onUserSelected, className }: UserSelectorProps) => {
  const { users, selectedUser, setSelectedUser, createUser, deleteUser, loading, canAddUser, canDeleteUser, getUserLimit } = useUsers();
  const { toast } = useToast();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserData>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    relationship: 'self',
    is_primary: false
  });

  const handleUserChange = (userId: string) => {
    const user = users.find(p => p.id === userId) || null;
    setSelectedUser(user);
    onUserSelected?.(user);
  };

  const handleCreateUser = async () => {
    if (!newUser.first_name || !newUser.last_name) {
      toast({
        title: "Missing Information",
        description: "Please enter at least first and last name.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createUser({
        ...newUser,
        is_primary: users.length === 0 // First user is automatically primary
      });
      
      toast({
        title: "User Added",
        description: `${newUser.first_name} ${newUser.last_name} has been added successfully.`
      });

      setIsAddingUser(false);
      setNewUser({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        relationship: 'self',
        is_primary: false
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add user. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await deleteUser(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span className="text-sm text-muted-foreground">Loading users...</span>
      </div>
    );
  }

  if (users.length === 0) {
    const userLimit = getUserLimit();
    
    if (userLimit === 0) {
      return (
        <Card className={className}>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Subscription Required
            </CardTitle>
            <CardDescription>
              A subscription is required to add users. Please upgrade to access this feature.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    
    return (
      <Card className={className}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Users className="h-5 w-5" />
            No Users Added
          </CardTitle>
          <CardDescription>
            You need to add at least one user before you can start chatting with DrKnowsIt.
            Your plan allows up to {userLimit} users.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newUser.date_of_birth}
                    onChange={(e) => setNewUser({ ...newUser, date_of_birth: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select onValueChange={(value) => setNewUser({ ...newUser, gender: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="relationship">Relationship to You</Label>
                  <Select 
                    value={newUser.relationship} 
                    onValueChange={(value) => setNewUser({ ...newUser, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Myself</SelectItem>
                      <SelectItem value="spouse">Spouse/Partner</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other-family">Other Family Member</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleCreateUser} className="w-full">
                  Add User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <UserIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">User:</span>
      </div>
      
      <Select 
        value={selectedUser?.id || ''} 
        onValueChange={handleUserChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <span>{user.first_name} {user.last_name}</span>
                  {user.is_primary && (
                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center space-x-2">
        {/* Add User Button */}
        <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={!canAddUser()}
              title={!canAddUser() ? `User limit reached (${getUserLimit()} max)` : undefined}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add User
              {!canAddUser() && <Lock className="h-3 w-3 ml-1" />}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={newUser.date_of_birth}
                  onChange={(e) => setNewUser({ ...newUser, date_of_birth: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(value) => setNewUser({ ...newUser, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="relationship">Relationship to You</Label>
                <Select 
                  value={newUser.relationship} 
                  onValueChange={(value) => setNewUser({ ...newUser, relationship: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Myself</SelectItem>
                    <SelectItem value="spouse">Spouse/Partner</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other-family">Other Family Member</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateUser} className="w-full">
                Add User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Backward compatibility exports
export const PatientSelector = UserSelector;