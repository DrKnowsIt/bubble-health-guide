import { useState, useRef, useCallback } from 'react';

interface RequestDebounceOptions {
  cooldownMs?: number;
  maxConcurrentRequests?: number;
}

interface RequestState {
  isInCooldown: boolean;
  lastRequestTime: number;
  activeRequests: Set<string>;
  failedRequestCount: number;
  lastFailureTime: number;
  blockedUntil: number;
}

export const useRequestDebounce = ({
  cooldownMs = 3000, // 3 second cooldown between requests
  maxConcurrentRequests = 1
}: RequestDebounceOptions = {}) => {
  const [state, setState] = useState<RequestState>({
    isInCooldown: false,
    lastRequestTime: 0,
    activeRequests: new Set(),
    failedRequestCount: 0,
    lastFailureTime: 0,
    blockedUntil: 0
  });

  // Circuit breaker: Block after 5 failures within 5 minutes
  const FAILURE_THRESHOLD = 5;
  const FAILURE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  const cooldownTimeoutRef = useRef<NodeJS.Timeout>();

  const canMakeRequest = useCallback((): { allowed: boolean; reason?: string; waitTime?: number } => {
    const now = Date.now();
    
    // Check if blocked by circuit breaker
    if (state.blockedUntil > now) {
      return {
        allowed: false,
        reason: 'Too many failed requests. Please try again later.',
        waitTime: state.blockedUntil - now
      };
    }

    // Check if in cooldown
    const timeSinceLastRequest = now - state.lastRequestTime;
    if (state.isInCooldown || timeSinceLastRequest < cooldownMs) {
      return {
        allowed: false,
        reason: 'Please wait before sending another message.',
        waitTime: cooldownMs - timeSinceLastRequest
      };
    }

    // Check concurrent request limit
    if (state.activeRequests.size >= maxConcurrentRequests) {
      return {
        allowed: false,
        reason: 'Another request is already in progress. Please wait.',
        waitTime: 2000
      };
    }

    return { allowed: true };
  }, [state, cooldownMs, maxConcurrentRequests]);

  const startRequest = useCallback((requestId: string): boolean => {
    const { allowed } = canMakeRequest();
    if (!allowed) return false;

    const now = Date.now();
    setState(prev => ({
      ...prev,
      isInCooldown: true,
      lastRequestTime: now,
      activeRequests: new Set([...prev.activeRequests, requestId])
    }));

    // Start cooldown timer
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
    }
    
    cooldownTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isInCooldown: false }));
    }, cooldownMs);

    return true;
  }, [canMakeRequest, cooldownMs]);

  const completeRequest = useCallback((requestId: string, success: boolean) => {
    setState(prev => {
      const newActiveRequests = new Set(prev.activeRequests);
      newActiveRequests.delete(requestId);
      
      const now = Date.now();
      let newFailedCount = prev.failedRequestCount;
      let newLastFailure = prev.lastFailureTime;
      let newBlockedUntil = prev.blockedUntil;

      if (!success) {
        // Reset failure count if last failure was more than window ago
        if (now - prev.lastFailureTime > FAILURE_WINDOW_MS) {
          newFailedCount = 1;
        } else {
          newFailedCount = prev.failedRequestCount + 1;
        }
        newLastFailure = now;

        // Activate circuit breaker if threshold reached
        if (newFailedCount >= FAILURE_THRESHOLD) {
          newBlockedUntil = now + BLOCK_DURATION_MS;
          console.warn(`[RequestDebounce] Circuit breaker activated. Blocked for ${BLOCK_DURATION_MS / 1000 / 60} minutes.`);
        }
      } else {
        // Reset failure count on success (but only if recent)
        if (now - prev.lastFailureTime < FAILURE_WINDOW_MS) {
          newFailedCount = Math.max(0, prev.failedRequestCount - 1);
        }
      }

      return {
        ...prev,
        activeRequests: newActiveRequests,
        failedRequestCount: newFailedCount,
        lastFailureTime: newLastFailure,
        blockedUntil: newBlockedUntil
      };
    });
  }, []);

  const getRemainingCooldown = useCallback((): number => {
    if (!state.isInCooldown) return 0;
    const elapsed = Date.now() - state.lastRequestTime;
    return Math.max(0, cooldownMs - elapsed);
  }, [state.isInCooldown, state.lastRequestTime, cooldownMs]);

  const getBlockTimeRemaining = useCallback((): number => {
    const now = Date.now();
    return Math.max(0, state.blockedUntil - now);
  }, [state.blockedUntil]);

  const resetCircuitBreaker = useCallback(() => {
    setState(prev => ({
      ...prev,
      failedRequestCount: 0,
      blockedUntil: 0,
      lastFailureTime: 0
    }));
  }, []);

  return {
    canMakeRequest,
    startRequest,
    completeRequest,
    getRemainingCooldown,
    getBlockTimeRemaining,
    resetCircuitBreaker,
    isInCooldown: state.isInCooldown,
    activeRequestCount: state.activeRequests.size,
    failedRequestCount: state.failedRequestCount,
    isBlocked: state.blockedUntil > Date.now()
  };
};