import { useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useNavigationDebounce = (delay: number = 300) => {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationRef = useRef<string>('');

  const debouncedNavigate = useCallback((
    to: string, 
    options?: { replace?: boolean; state?: any }
  ) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't navigate if already on the same route
    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath === to) {
      console.log('Navigation debounced: Already on target route:', to);
      return;
    }

    // Prevent rapid repeated navigations to the same route
    if (lastNavigationRef.current === to) {
      console.log('Navigation debounced: Duplicate navigation prevented:', to);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      console.log('Navigation debounced: Executing navigation to:', to);
      lastNavigationRef.current = to;
      navigate(to, options);
      
      // Reset after navigation
      setTimeout(() => {
        lastNavigationRef.current = '';
      }, 1000);
    }, delay);
  }, [navigate, location, delay]);

  return { debouncedNavigate, currentPath: `${location.pathname}${location.search}` };
};