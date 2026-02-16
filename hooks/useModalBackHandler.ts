
import { useEffect, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';

/**
 * Enhanced Back Handler V2:
 * Connects local modal state to the Global Navigation Context.
 * 
 * @param isOpen - Boolean indicating if the modal is visible
 * @param onClose - Function to close the modal (set isOpen false)
 * @param modalId - Optional unique ID. If not provided, one is generated.
 */
export const useModalBackHandler = (isOpen: boolean, onClose: () => void, modalId?: string) => {
  const { registerModal, unregisterModal } = useNavigation();
  // Generate a stable ID if not provided, or use the provided one
  // We use a ref to keep the ID stable across renders
  const idRef = useRef(modalId || `modal_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (isOpen) {
      // When modal opens, register it to the global stack
      registerModal(idRef.current, onClose);
    } else {
      // When modal closes (programmatically), unregister it
      // This handles the "X" button click
      unregisterModal(idRef.current);
    }

    // Cleanup: If component unmounts while open (rare, but possible), clean up
    return () => {
      // We only unregister if it was open. 
      // Note: unregisterModal handles the check internally if it exists in stack.
      if (isOpen) {
          unregisterModal(idRef.current);
      }
    };
  }, [isOpen, registerModal, unregisterModal, onClose]); 
  // Added onClose to deps: if the handler changes, we might ideally update the stack,
  // but typically onClose is stable or the modal remounts.
};
