
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
  const [currentTab, setCurrentTab] = useState<ViewType>('home');
  
  // The Stack: Stores objects { id: 'modalName', onClose: func }
  // We use a Ref for the stack to ensure instant access in event listeners without stale closures
  const modalStackRef = useRef<{ id: string; onClose: () => void }[]>([]);
  // We keep a state version just to trigger re-renders if needed (e.g. for UI checks), 
  // but logic relies on ref
  const [stackLength, setStackLength] = useState(0);

  // Flag to ignore popstate events that we triggered programmatically (via history.back())
  const ignoreNextPop = useRef(false);

  const switchTab = useCallback((tab: ViewType) => {
    if (tab === currentTab && modalStackRef.current.length > 0) {
        // Tapping the active tab button clears all modals (Native behavior)
        closeAllModals();
    } else {
        setCurrentTab(tab);
        // Switching tabs implies starting fresh on that tab (usually)
        closeAllModals(); 
    }
  }, [currentTab]);

  const closeAllModals = () => {
      // Recursively close or just clear? 
      // Better to clear safely. 
      // Note: This forces close without animation or history sync for every single one, 
      // so typically we just reset the stack logic. 
      // For a web app, we might just want to let the components unmount.
      // But purely for state:
      while(modalStackRef.current.length > 0) {
          const top = modalStackRef.current.pop();
          if (top) top.onClose();
      }
      setStackLength(0);
  };

  const registerModal = useCallback((id: string, onClose: () => void) => {
    // 1. Push a dummy state to history so the back button is "armed"
    window.history.pushState({ modal: id }, '', window.location.href);
    
    // 2. Add to our logical stack
    modalStackRef.current.push({ id, onClose });
    setStackLength(modalStackRef.current.length);
    // console.log(`[Nav] Registered: ${id}. Stack: ${modalStackRef.current.length}`);
  }, []);

  const unregisterModal = useCallback((id: string) => {
    // Find if this modal is in the stack
    const index = modalStackRef.current.findIndex(m => m.id === id);
    if (index !== -1) {
        // Remove from stack
        modalStackRef.current.splice(index, 1);
        setStackLength(modalStackRef.current.length);
        
        // CRITICAL: Since we closed it programmatically (e.g. X button), 
        // we must sync browser history by going back one step.
        // BUT, this will trigger a 'popstate' event. We must tell our listener to ignore it.
        ignoreNextPop.current = true;
        window.history.back();
        // console.log(`[Nav] Unregistered: ${id}. Syncing History.`);
    }
  }, []);

  // The Master Handler for the Physical Back Button
  const handlePhysicalBack = useCallback(() => {
      if (ignoreNextPop.current) {
          // console.log("[Nav] Ignoring Programmatic Pop");
          ignoreNextPop.current = false;
          return;
      }

      // Priority 1: Close Top Modal
      if (modalStackRef.current.length > 0) {
          const top = modalStackRef.current.pop();
          setStackLength(modalStackRef.current.length);
          if (top) {
              // console.log(`[Nav] Pop Modal: ${top.id}`);
              top.onClose(); // This updates the UI state (isOpen = false)
          }
          // We consumed the event, so we don't need to do anything else.
          // The browser history is already -1 because the user pressed Back.
          return;
      }

      // Priority 2: Navigate Tabs (Sub-tab -> Home)
      if (currentTab !== 'home') {
          // console.log("[Nav] Tab -> Home");
          setCurrentTab('home');
          // Since the user pressed back, the browser is already at previous state.
          // But if we didn't have a history state for the tab switch, we might have exited.
          // To be safe, usually we don't push state for tabs unless deep linking.
          // If we want "Back to Home" to work, we need to ensure we are "forward" enough.
          // For now, let's assume we handle tab switching internally.
          // If the browser actually went back, we just update state.
          return;
      }

      // Priority 3: Exit App
      // If we are here, we let the default browser behavior happen (which has already happened).
      // console.log("[Nav] Default Exit");
  }, [currentTab]);

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
