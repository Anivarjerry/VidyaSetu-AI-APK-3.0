
import { useEffect, useRef } from 'react';

/**
 * Enhanced Back Handler:
 * Instead of pushing a simple state, we use a counter to track depth.
 * This prevents the browser from exiting the app when we just wanted to close a modal.
 */
export const useModalBackHandler = (isOpen: boolean, onClose: () => void) => {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // 1. Push a state to the history stack
      const state = { modalOpen: true, timestamp: Date.now() };
      window.history.pushState(state, '', window.location.href);

      // 2. Listen for popstate (Back Button)
      const handlePopState = (event: PopStateEvent) => {
        // If we popped back to a state where modalOpen is not true (or undefined), close it
        onCloseRef.current();
        // NOTE: We do NOT call history.back() here because the user *already* pressed back.
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        
        // 3. Cleanup: If component unmounts (via X button) but history state is still there
        // We need to check if the current state is the one we pushed.
        // Logic: If current state has our timestamp, go back.
        if (window.history.state && window.history.state.timestamp === state.timestamp) {
           window.history.back();
        }
      };
    }
  }, [isOpen]);
};
