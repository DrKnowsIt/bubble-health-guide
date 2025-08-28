import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import { useSubscription } from '../useSubscription';
import { useToast } from '../use-toast';
import { useState, useEffect } from 'react';

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
  is_pet?: boolean;
  species?: string;
  breed?: string;
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
  is_pet?: boolean;
  species?: string;
  breed?: string;
}

const USERS_QUERY_KEY = 'users';

export const useUsersQuery = () => {
  const { user: authUser } = useAuth();
  const { subscribed, subscription_tier } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users with React Query caching
  const {
    data: users = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: [USERS_QUERY_KEY, authUser?.id],
    queryFn: async (): Promise<User[]> => {
      if (!authUser) return [];

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', authUser.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(user => ({
        ...user,
        probable_diagnoses: Array.isArray(user.probable_diagnoses) 
          ? user.probable_diagnoses as unknown as Diagnosis[]
          : []
      }));
    },
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Get user limit based on subscription
  const getUserLimit = () => {
    if (!subscribed || !subscription_tier) return 0;
    if (subscription_tier === 'basic') return 1;
    if (subscription_tier === 'pro') return 10;
    return 0;
  };

  // Check if user can add more users
  const canAddUser = () => {
    const limit = getUserLimit();
    return users.length < limit;
  };

  // Check if a user can be deleted
  const canDeleteUser = (user: User) => {
    return !user.is_primary;
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      if (!authUser) throw new Error('User not authenticated');
      
      if (!canAddUser()) {
        const limit = getUserLimit();
        if (limit === 0) {
          throw new Error('A subscription is required to add users. Please upgrade to access this feature.');
        } else {
          throw new Error(`User limit reached. Your ${subscription_tier} plan allows up to ${limit} users. Please upgrade to add more users.`);
        }
      }

      const { data, error } = await supabase
        .from('patients')
        .insert([{
          ...userData,
          user_id: authUser.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<CreateUserData> }) => {
      if (!authUser) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', userId)
        .eq('user_id', authUser.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!authUser) throw new Error('User not authenticated');

      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) throw new Error('User not found');
      if (!canDeleteUser(userToDelete)) throw new Error('Cannot delete the main profile user');

      // Delete associated data first
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', userId);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        await supabase.from('messages').delete().in('conversation_id', conversationIds);
      }

      // Delete all related data in parallel
      await Promise.all([
        supabase.from('conversations').delete().eq('patient_id', userId),
        supabase.from('health_records').delete().eq('patient_id', userId),
        supabase.from('diagnosis_feedback').delete().eq('patient_id', userId),
        supabase.from('conversation_diagnoses').delete().eq('patient_id', userId),
        supabase.from('doctor_notes').delete().eq('patient_id', userId),
      ]);

      // Finally delete the user
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', userId)
        .eq('user_id', authUser.id);

      if (error) throw error;
      
      return { userId, userToDelete };
    },
  });

  // Effects for handling mutation success/error
  // Enhanced user selection logic - ensures there's ALWAYS a user selected when users exist
  useEffect(() => {
    if (users.length > 0) {
      // If no user is selected, or the selected user is no longer in the users array
      if (!selectedUser || !users.find(u => u.id === selectedUser.id)) {
        // Prioritize primary user first, then fallback to first available user
        const primaryUser = users.find(p => p.is_primary);
        const userToSelect = primaryUser || users[0];
        
        console.log('Auto-selecting user:', userToSelect.first_name, userToSelect.is_primary ? '(primary)' : '(first available)');
        setSelectedUser(userToSelect);
      }
    } else if (users.length === 0 && selectedUser) {
      // Clear selection if no users exist
      setSelectedUser(null);
    }
  }, [users, selectedUser]);

  useEffect(() => {
    if (createUserMutation.isSuccess && createUserMutation.data) {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      
      const transformedUser = {
        ...createUserMutation.data,
        probable_diagnoses: Array.isArray(createUserMutation.data.probable_diagnoses) 
          ? createUserMutation.data.probable_diagnoses as unknown as Diagnosis[]
          : []
      };

      if (users.length === 0 || createUserMutation.data.is_primary) {
        setSelectedUser(transformedUser);
      }
    }
    
    if (createUserMutation.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: createUserMutation.error instanceof Error ? createUserMutation.error.message : "Failed to create user",
      });
    }
  }, [createUserMutation.isSuccess, createUserMutation.data, createUserMutation.error, queryClient, users.length, toast]);

  useEffect(() => {
    if (updateUserMutation.isSuccess && updateUserMutation.data) {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      
      const transformedUser = {
        ...updateUserMutation.data,
        probable_diagnoses: Array.isArray(updateUserMutation.data.probable_diagnoses) 
          ? updateUserMutation.data.probable_diagnoses as unknown as Diagnosis[]
          : []
      };

      if (selectedUser?.id === updateUserMutation.data.id) {
        setSelectedUser(transformedUser);
      }
    }
    
    if (updateUserMutation.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user",
      });
    }
  }, [updateUserMutation.isSuccess, updateUserMutation.data, updateUserMutation.error, queryClient, selectedUser?.id, toast]);

  useEffect(() => {
    if (deleteUserMutation.isSuccess && deleteUserMutation.data) {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      
      const { userId, userToDelete } = deleteUserMutation.data;
      
      if (selectedUser?.id === userId) {
        const remainingUsers = users.filter(p => p.id !== userId);
        setSelectedUser(remainingUsers.length > 0 ? remainingUsers[0] : null);
      }

      toast({
        title: "User Deleted",
        description: `${userToDelete.first_name} ${userToDelete.last_name} and all associated data has been permanently deleted.`,
      });
    }
    
    if (deleteUserMutation.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user. Please try again.",
      });
    }
  }, [deleteUserMutation.isSuccess, deleteUserMutation.data, deleteUserMutation.error, queryClient, selectedUser?.id, users, toast]);

  return {
    users,
    selectedUser,
    setSelectedUser,
    loading,
    createUser: createUserMutation.mutate,
    updateUser: (userId: string, updates: Partial<CreateUserData>) => 
      updateUserMutation.mutate({ userId, updates }),
    deleteUser: deleteUserMutation.mutate,
    refreshUsers: refetch,
    canAddUser,
    canDeleteUser,
    getUserLimit,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
};