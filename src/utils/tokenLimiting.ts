// Simplified token utilities for server communication only
export const TOKEN_LIMIT = 30000;
export const TIMEOUT_DURATION = 3 * 60 * 60 * 1000; // 3 hours

export const formatTimeUntilReset = (milliseconds: number): string => {
  const totalMinutes = Math.ceil(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};