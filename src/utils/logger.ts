/**
 * Unified logging utility with environment-aware log levels
 * 
 * In development: All logs are shown
 * In production: Only errors and warnings are shown
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('Debug message', { data });
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 */

const isDevelopment = import.meta.env.DEV;

// Log levels for filtering
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// In production, only show warnings and errors
const shouldLog = (level: LogLevel): boolean => {
  if (isDevelopment) return true;
  return level === 'warn' || level === 'error';
};

// Prefix icons for each log level
const levelIcons: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌'
};

export const logger = {
  /**
   * General log - development only
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  /**
   * Debug logs - development only, for detailed debugging
   */
  debug: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    if (data !== undefined) {
      console.log(`${levelIcons.debug} ${message}`, data);
    } else {
      console.log(`${levelIcons.debug} ${message}`);
    }
  },
  
  /**
   * Info logs - development only, for general information
   */
  info: (message: string, data?: any) => {
    if (!shouldLog('info')) return;
    if (data !== undefined) {
      console.log(`${levelIcons.info} ${message}`, data);
    } else {
      console.log(`${levelIcons.info} ${message}`);
    }
  },
  
  /**
   * Warning logs - shown in both dev and production
   */
  warn: (message: string, data?: any) => {
    if (!shouldLog('warn')) return;
    if (data !== undefined) {
      console.warn(`${levelIcons.warn} ${message}`, data);
    } else {
      console.warn(`${levelIcons.warn} ${message}`);
    }
  },
  
  /**
   * Error logs - always shown, even in production
   */
  error: (message: string, error?: any) => {
    if (error !== undefined) {
      console.error(`${levelIcons.error} ${message}`, error);
    } else {
      console.error(`${levelIcons.error} ${message}`);
    }
  },

  /**
   * Group logs for related operations - development only
   */
  group: (label: string, fn: () => void) => {
    if (!isDevelopment) return fn();
    console.group(label);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  },

  /**
   * Time an operation - development only
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (!isDevelopment) return fn();
    console.time(label);
    try {
      return await fn();
    } finally {
      console.timeEnd(label);
    }
  }
};