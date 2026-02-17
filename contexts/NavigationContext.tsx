
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

type ViewType = 'home' | 'profile' | 'action' | 'manage';

interface NavigationContextType {
  currentTab: ViewType;
  switchTab: (tab: ViewType) => void;
  activeModalId: string | null;
  registerModal: (id: string, closeCallback: () => void) => void;
  unregisterModal: (id: string) => void;
  handlePhysicalBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. VIEW STACK: Tracks the history of Tabs (e.g., ['home', 'profile'])
  // We initialize with 'home' as the base.
  const [viewStack, setViewStack] = useState<ViewType[]>(['home']);
  
  // 2. MODAL STACK: Tracks open modals
  const modalStackRef = useRef<{ id: string; onClose: () => void }[]>([]);
  const [modalCount, setModalCount] = useState(0); // Trigger re-render when modals change

  // Flag to prevent double-handling when we programmatically change history
  const isProgrammaticNav = useRef(false);

  // --- SMART TAB SWITCHING (Loop Detection) ---
  const switchTab = useCallback((newTab: ViewType) => {
    setViewStack((prevStack) => {
      // A. Check if the tab is already in the history (LOOP DETECTION)
      const existingIndex = prevStack.indexOf(newTab);

      if (existingIndex !== -1) {
        // CASE: LOOP DETECTED (e.g. Home -> Profile -> Home)
        // We need to "Unwind" the history back to that previous instance.
        
        // Calculate how many steps to go back
        const stepsBack = prevStack.length - 1 - existingIndex;
        
        if (stepsBack > 0) {
          isProgrammaticNav.current = true;
          // Clean browser history by going back 'n' times
          window.history.go(-stepsBack);
          
          // Return the sliced stack (removing everything after the found tab)
          return prevStack.slice(0, existingIndex + 1);
        }
        return prevStack; // Already on this tab
      } else {
        // CASE: NEW STEP (e.g. Home -> Profile)
        // Push to browser history
        window.history.pushState({ view: newTab }, '', window.location.href);
        // Add to our internal stack
        return [...prevStack, newTab];
      }
    });
  }, []);

  // --- MODAL REGISTRATION ---
  const registerModal = useCallback((id: string, onClose: () => void) => {
    // Push a history state for the modal
    window.history.pushState({ modal: id }, '', window.location.href);
    modalStackRef.current.push({ id, onClose });
    setModalCount(prev => prev + 1);
  }, []);

  const unregisterModal = useCallback((id: string) => {
    // Find the modal
    const index = modalStackRef.current.findIndex(m => m.id === id);
    if (index !== -1) {
      // Remove from stack logic
      modalStackRef.current.splice(index, 1);
      setModalCount(prev => prev - 1);
      
      // Sync Browser History: Go back 1 step (remove the modal state)
      isProgrammaticNav.current = true;
      window.history.back();
    }
  }, []);

  // --- PHYSICAL BACK BUTTON HANDLER (Called by App.tsx on 'popstate') ---
  const handlePhysicalBack = useCallback(() => {
    // 1. If we triggered this pop (e.g. unregisterModal calling history.back), ignore logic
    if (isProgrammaticNav.current) {
      isProgrammaticNav.current = false;
      return;
    }

    // 2. Priority: Close Modals First
    if (modalStackRef.current.length > 0) {
      const topModal = modalStackRef.current.pop();
      setModalCount(prev => prev - 1);
      if (topModal) {
        // Just call the close callback. 
        // The browser history is already popped by the user action.
        // We DON'T call unregisterModal here to avoid double-pop.
        topModal.onClose(); 
      }
      return;
    }

    // 3. Handle View Stack (Tabs)
    setViewStack((prevStack) => {
      if (prevStack.length > 1) {
        // User pressed back, so browser history is already -1.
        // We just need to sync our internal array.
        return prevStack.slice(0, -1);
      } else {
        // Stack is empty (at Home). 
        // Default browser behavior (Exit App) happens automatically if we don't pushState.
        return prevStack;
      }
    });
  }, []);

  // Helper to get current active tab
  const currentTab = viewStack[viewStack.length - 1];

  return (
    <NavigationContext.Provider value={{ 
        currentTab, 
        switchTab, 
        activeModalId: modalStackRef.current.length > 0 ? modalStackRef.current[modalStackRef.current.length - 1].id : null,
        registerModal, 
        unregisterModal,
        handlePhysicalBack
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used within NavigationProvider');
  return context;
};
