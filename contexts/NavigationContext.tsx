
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

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
  // 1. VIEW STACK: Tracks the history of Tabs
  // We use a Ref for logic (immediate access) and State for rendering.
  const viewStackRef = useRef<ViewType[]>(['home']);
  const [viewStack, _setViewStack] = useState<ViewType[]>(['home']);

  // Helper to keep Ref and State in sync
  const updateViewStack = (newStack: ViewType[]) => {
    viewStackRef.current = newStack;
    _setViewStack(newStack);
  };
  
  // 2. MODAL STACK
  const modalStackRef = useRef<{ id: string; onClose: () => void }[]>([]);
  const [modalCount, setModalCount] = useState(0); // Used to trigger re-renders when modals open/close

  // Flag to differentiate between User Back Press vs App Programmatic Back
  const isProgrammaticNav = useRef(false);

  // --- SMART TAB SWITCHING (Loop Detection) ---
  const switchTab = useCallback((newTab: ViewType) => {
    const currentStack = viewStackRef.current;
    const existingIndex = currentStack.indexOf(newTab);

    if (existingIndex !== -1) {
      // CASE: LOOP DETECTED (e.g. Home -> Profile -> Home)
      // Unwind history instead of pushing new state.
      const stepsBack = currentStack.length - 1 - existingIndex;
      
      if (stepsBack > 0) {
        isProgrammaticNav.current = true;
        // Go back 'n' steps in browser history
        window.history.go(-stepsBack);
        // Update app state immediately to match the target view
        updateViewStack(currentStack.slice(0, existingIndex + 1));
      }
    } else {
      // CASE: NEW STEP
      // Push new entry to browser history
      window.history.pushState({ view: newTab }, '', window.location.href);
      updateViewStack([...currentStack, newTab]);
    }
  }, []);

  // --- MODAL REGISTRATION ---
  const registerModal = useCallback((id: string, onClose: () => void) => {
    // Push a history state specifically for the modal
    window.history.pushState({ modal: id }, '', window.location.href);
    modalStackRef.current.push({ id, onClose });
    setModalCount(prev => prev + 1);
  }, []);

  const unregisterModal = useCallback((id: string) => {
    const index = modalStackRef.current.findIndex(m => m.id === id);
    if (index !== -1) {
      // Remove from internal stack
      modalStackRef.current.splice(index, 1);
      setModalCount(prev => prev - 1);
      
      // Sync Browser History: Go back 1 step
      isProgrammaticNav.current = true;
      window.history.back();
    }
  }, []);

  // --- PHYSICAL BACK BUTTON HANDLER (Called by App.tsx on 'popstate') ---
  const handlePhysicalBack = useCallback(() => {
    // 1. If this event was triggered by our own code (history.go/back), ignore logic
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
        topModal.onClose(); 
      }
      return;
    }

    // 3. Handle View Stack (Tabs)
    const currentStack = viewStackRef.current;
    if (currentStack.length > 1) {
      // User pressed back, so browser history is already -1.
      // We just need to sync our internal stack to match.
      updateViewStack(currentStack.slice(0, -1));
    } else {
      // Stack is empty or at root (Home). 
      // Default browser behavior (Exit App / Minimize) happens automatically.
    }
  }, []);

  // Helper to get current active tab for UI rendering
  const currentTab = viewStack[viewStack.length - 1];
  
  // Helper to get active modal ID
  const activeModalId = modalStackRef.current.length > 0 
    ? modalStackRef.current[modalStackRef.current.length - 1].id 
    : null;

  return (
    <NavigationContext.Provider value={{ 
        currentTab, 
        switchTab, 
        activeModalId,
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
