import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';

interface HealthRecordHistoryTabProps {
  patientId?: string;
}

export const HealthRecordHistoryTab = ({ patientId }: HealthRecordHistoryTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Health Record History
          </CardTitle>
          <CardDescription>
            Track changes and updates to your health records over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Health record history will be displayed here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};