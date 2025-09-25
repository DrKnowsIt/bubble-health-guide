// Simplified token utilities for server communication only
export const TOKEN_LIMIT = 300;
export const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export const formatTimeUntilReset = (milliseconds: number): string => {
  const minutes = Math.ceil(milliseconds / (1000 * 60));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};