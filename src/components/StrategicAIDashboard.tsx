import React from 'react';
import { DoctorNotesManager } from '@/components/DoctorNotesManager';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { usePatients } from '@/hooks/usePatients';

export const StrategicAIDashboard = () => {
  const { selectedPatient } = usePatients();

  return (
    <SubscriptionGate
      requiredTier="basic"
      feature="Strategic AI System"
      description="Access advanced AI memory and strategic health data referencing with a subscription."
    >
      <div className="space-y-6">
        <DoctorNotesManager patientId={selectedPatient?.id} />
      </div>
    </SubscriptionGate>
  );
};