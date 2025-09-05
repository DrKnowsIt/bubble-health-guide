// Application constants and configuration
export const APP_NAME = 'DrKnowsIt';

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro'
} as const;

export const CONVERSATION_TYPES = {
  EASY_CHAT: 'easy_chat',
  FULL_CHAT: 'full_chat'
} as const;

export const MEMBER_TYPES = {
  HUMAN: 'human',
  PET: 'pet'
} as const;

export const ANALYSIS_TYPES = {
  DIAGNOSIS: 'diagnosis',
  SOLUTION: 'solution', 
  MEMORY: 'memory'
} as const;

export const CHAT_PHASES = {
  ANATOMY_SELECTION: 'anatomy-selection',
  CHAT: 'chat',
  COMPLETED: 'completed'
} as const;

export const VIEW_TYPES = {
  FRONT: 'front',
  BACK: 'back'
} as const;

export const DIALOG_STEPS = {
  TYPE_SELECTION: 'type-selection',
  FORM: 'form'
} as const;

// PDF Export Constants
export const PDF_CONFIG = {
  MARGIN: 20,
  LINE_HEIGHT: 6,
  FONT_SIZE: 12,
  TITLE_FONT_SIZE: 16
} as const;

// Session Storage Keys
export const STORAGE_KEYS = {
  AI_FREE_MODE_SESSION: 'aiFreeMode_sessionData',
  CHAT_ANALYSIS_NOTIFICATION: 'chatAnalysisNotification_lastShown'
} as const;