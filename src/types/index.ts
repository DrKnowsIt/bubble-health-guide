// Shared TypeScript interfaces and types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  insurance_info?: string;
  preferred_language?: string;
  gender?: string;
  height?: string;
  weight?: string;
  blood_type?: string;
  allergies?: string[];
  medications?: string[];
  medical_conditions?: string[];
  created_at?: string;
  updated_at?: string;
  medical_disclaimer_accepted?: boolean;
  medical_disclaimer_accepted_at?: string;
}

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string;
  conversationId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  patient_id?: string;
}

export interface GeneratedTopic {
  topic: string;
  confidence: number;
  reasoning: string;
  category?: string;
}

export interface HealthAnalysis {
  type: 'diagnosis' | 'solution' | 'memory';
  data: any;
}

export type ChatPhase = 'anatomy-selection' | 'chat' | 'completed';
export type MemberType = 'human' | 'pet' | null;
export type DialogStep = 'type-selection' | 'form';
export type ViewType = 'front' | 'back';