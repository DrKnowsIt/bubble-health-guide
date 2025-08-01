// Utility functions for ensuring data segregation and user access validation

export const validateUserAccess = (itemUserId: string, currentUserId: string | undefined): boolean => {
  if (!currentUserId) {
    console.warn('User not authenticated');
    return false;
  }
  
  if (itemUserId !== currentUserId) {
    console.warn('Access denied: User ID mismatch');
    return false;
  }
  
  return true;
};

export const validatePatientAccess = (patientUserId: string, currentUserId: string | undefined): boolean => {
  return validateUserAccess(patientUserId, currentUserId);
};

export const sanitizeHealthRecordData = (records: any[], userId: string): any[] => {
  return records.filter(record => record.user_id === userId);
};

export const sanitizeConversationData = (conversations: any[], userId: string): any[] => {
  return conversations.filter(conversation => conversation.user_id === userId);
};

export const formatHealthRecordForAI = (record: any): string => {
  let formatted = `${record.title} (${record.record_type})`;
  
  if (record.data && typeof record.data === 'object') {
    try {
      const dataStr = JSON.stringify(record.data, null, 2);
      if (dataStr !== '{}' && dataStr !== 'null') {
        formatted += `\n  Data: ${dataStr}`;
      }
    } catch (e) {
      console.warn('Error parsing record data:', e);
    }
  }
  
  if (record.file_url) {
    formatted += '\n  Note: Contains file attachment';
  }
  
  return formatted;
};

export const buildPatientSummary = (patient: any): string => {
  const age = patient.date_of_birth 
    ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return `${patient.first_name} ${patient.last_name} (${age ? `${age} years old` : 'Age unknown'}, ${patient.gender || 'Gender not specified'}, ${patient.relationship})`;
};