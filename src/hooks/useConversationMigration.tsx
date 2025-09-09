import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useConversationMigration = () => {
  const { user } = useAuth();

  useEffect(() => {
    const migrateOrphanedConversations = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase.functions.invoke('migrate-conversations-to-episodes');
        if (data?.migrated > 0) {
          console.log(`✅ Migrated ${data.migrated} conversations to episodes`);
          toast({
            title: "Chat History Updated",
            description: `We've organized ${data.migrated} of your previous conversations into health episodes for better organization.`,
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('❌ Migration error:', error);
        // Don't show error to user as this is a background operation
      }
    };
    
    // Only run once per session to avoid repeated migrations
    const migrationKey = `conversations_migrated_${user?.id}`;
    const hasRunMigration = sessionStorage.getItem(migrationKey);
    
    if (!hasRunMigration && user) {
      migrateOrphanedConversations();
      sessionStorage.setItem(migrationKey, 'true');
    }
  }, [user]);
};