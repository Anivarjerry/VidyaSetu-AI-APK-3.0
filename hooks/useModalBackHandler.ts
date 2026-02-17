
import { useEffect, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';

/**
 * Enhanced Back Handler V3 (Stability Fix):
 * Connects local modal state to the Global Navigation Context.
 * 
 * FIX: Uses a Ref for `onClose` to prevent the effect from re-running 
 * when the parent component re-renders and creates a new `onClose` function reference.
 * This prevents the "History Pop -> Push" loop that was breaking the back button.
 * 
 * @param isOpen - Boolean indicating if the modal is visible
 * @param onClose - Function to close the modal (set isOpen false)
 * @param modalId - Optional unique ID. If not provided, one is generated.
 */
export const useModalBackHandler = (isOpen: boolean, onClose: () => void, modalId?: string) => {
  const { registerModal, unregisterModal } = useNavigation();
  
  // Generate a stable ID if not provided
  const idRef = useRef(modalId || `modal_${Math.random().toString(36).substr(2, 9)}`);

  // 1. Keep the latest onClose callback in a ref.
  // This allows us to call the *latest* version of the function without 
  // adding it to the useEffect dependency array.
  const onCloseRef = useRef(onClose);

  // Update the ref whenever the passed function changes (on every render)
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 2. Main Logic Effect
  // Only runs when `isOpen` changes or the navigation context methods change (which are stable).
  useEffect(() => {
    const currentId = idRef.current;

    if (isOpen) {
      // When modal opens, register it to the global stack.
      // We pass a wrapper function that calls our Ref.
      registerModal(currentId, () => {
        if (onCloseRef.current) {
            onCloseRef.current();
        }
      });
    } else {
      // When modal closes (programmatically via code/button), unregister it.
      unregisterModal(currentId);
    }

    // Cleanup: If component unmounts while open (rare, but possible), clean up.
    return () => {
      // Context's unregisterModal safely handles cases where ID isn't in stack.
      // We pass the ID explicitly to ensure cleanup.
      if (isOpen) {
          unregisterModal(currentId);
      }
    };
  }, [isOpen, registerModal, unregisterModal]); 
  // CRITICAL: `onClose` is NOT in the dependency array. 
  // This prevents the infinite loop of register/unregister on re-renders.
};
