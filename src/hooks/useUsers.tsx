import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { useToast } from './use-toast';

export interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

export interface User {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  relationship: string;
  is_primary: boolean;
  probable_diagnoses?: Diagnosis[];
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  relationship: string;
  is_primary?: boolean;
}

export const useUsers = () => {
  const { user: authUser } = useAuth();
  const { subscribed, subscription_tier } = useSubscription();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch users
  const fetchUsers = async (retryCount = 0) => {
    if (!authUser) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', authUser.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data to match User interface
      const transformedData = (data || []).map(user => ({
        ...user,
        probable_diagnoses: Array.isArray(user.probable_diagnoses) 
          ? user.probable_diagnoses as unknown as Diagnosis[]
          : []
      }));

      setUsers(transformedData);
      
      // Auto-select primary user or first user
      if (transformedData.length > 0 && !selectedUser) {
        const primaryUser = transformedData.find(p => p.is_primary);
        setSelectedUser(primaryUser || transformedData[0]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message?.includes('network') || error.message?.includes('timeout'))) {
        console.log(`Retrying users fetch... (attempt ${retryCount + 1})`);
        setTimeout(() => fetchUsers(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setUsers([]);
      setSelectedUser(null);
      
      // Only show toast if not a retry
      if (retryCount === 0) {
        toast({
          variant: "destructive",
          title: "Error Loading Users",
          description: "Failed to load user data. Please check your connection.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Get user limit based on subscription
  const getUserLimit = () => {
    if (!subscribed || !subscription_tier) return 0;
    if (subscription_tier === 'basic') return 2;
    if (subscription_tier === 'pro') return 10;
    return 0;
  };

  // Check if user can add more users
  const canAddUser = () => {
    const limit = getUserLimit();
    return users.length < limit;
  };

  // Check if a user can be deleted (cannot delete the main profile user)
  const canDeleteUser = (user: User) => {
    return !user.is_primary;
  };

  // Create a new user
  const createUser = async (userData: CreateUserData) => {
    if (!authUser) throw new Error('User not authenticated');
    
    // Check user limit
    if (!canAddUser()) {
      const limit = getUserLimit();
      if (limit === 0) {
        throw new Error('A subscription is required to add users. Please upgrade to access this feature.');
      } else {
        throw new Error(`User limit reached. Your ${subscription_tier} plan allows up to ${limit} users. Please upgrade to add more users.`);
      }
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          ...userData,
          user_id: authUser.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Transform data to match User interface
      const transformedUser = {
        ...data,
        probable_diagnoses: Array.isArray(data.probable_diagnoses) 
          ? data.probable_diagnoses as unknown as Diagnosis[]
          : []
      };

      setUsers(prev => [...prev, transformedUser]);
      
      // If this is the first user or is_primary, select it
      if (users.length === 0 || userData.is_primary) {
        setSelectedUser(transformedUser);
      }

      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  // Update a user
  const updateUser = async (userId: string, updates: Partial<CreateUserData>) => {
    if (!authUser) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', userId)
        .eq('user_id', authUser.id)
        .select()
        .single();

      if (error) throw error;

      // Transform data to match User interface
      const transformedUser = {
        ...data,
        probable_diagnoses: Array.isArray(data.probable_diagnoses) 
          ? data.probable_diagnoses as unknown as Diagnosis[]
          : []
      };

      setUsers(prev => 
        prev.map(p => p.id === userId ? transformedUser : p)
      );

      if (selectedUser?.id === userId) {
        setSelectedUser(transformedUser);
      }

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Delete a user
  const deleteUser = async (userId: string) => {
    if (!authUser) throw new Error('User not authenticated');

    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) {
      throw new Error('User not found');
    }

    // Prevent deletion of the main profile user
    if (!canDeleteUser(userToDelete)) {
      throw new Error('Cannot delete the main profile user');
    }

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', userId)
        .eq('user_id', authUser.id);

      if (error) throw error;

      setUsers(prev => prev.filter(p => p.id !== userId));
      
      if (selectedUser?.id === userId) {
        const remainingUsers = users.filter(p => p.id !== userId);
        setSelectedUser(remainingUsers.length > 0 ? remainingUsers[0] : null);
      }

      toast({
        title: "User Deleted",
        description: `${userToDelete.first_name} ${userToDelete.last_name} has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [authUser]);

  return {
    users,
    selectedUser,
    setSelectedUser,
    loading,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers: fetchUsers,
    canAddUser,
    canDeleteUser,
    getUserLimit
  };
};

// Export for backward compatibility
export const usePatients = useUsers;
export type Patient = User;
export type CreatePatientData = CreateUserData;