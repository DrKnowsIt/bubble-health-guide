import React from 'react';
import { HealthRecordHistory } from './HealthRecordHistory';
import { useUsers } from '@/hooks/useUsers';

interface HealthRecordHistoryTabProps {
  patientId?: string;
}

export const HealthRecordHistoryTab = ({ patientId }: HealthRecordHistoryTabProps) => {
  const { selectedUser } = useUsers();

  return (
    <div className="space-y-6">
      <HealthRecordHistory 
        patientId={patientId || selectedUser?.id} 
        maxEntries={20}
      />
    </div>
  );
};