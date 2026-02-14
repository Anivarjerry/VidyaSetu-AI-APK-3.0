
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ViewType = 'home' | 'profile' | 'action' | 'manage';

interface NavigationContextType {
  currentTab: ViewType;
  switchTab: (tab: ViewType) => void;
  modalStack: string[];
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
  closeAllModals: () => void;
  modalData: any; // Stores data passed to the current top modal
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<ViewType>('home');
  const [modalStack, setModalStack] = useState<string[]>([]);
  const [modalData, setModalData] = useState<any>(null);

  // Handle Browser Back Button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent default browser navigation behavior
      // event.preventDefault(); // popstate is not cancelable, but we can manage state

      if (modalStack.length > 0) {
        // If modals are open, close the top one
        setModalStack(prev => {
            const newStack = prev.slice(0, -1);
            // If stack becomes empty, we might want to clear data, but usually keep it for cache
            return newStack;
        });
        // Push state back to prevent exiting app if we still have modals or are not at root
        window.history.pushState(null, '', window.location.href);
      } else if (currentTab !== 'home') {
        // If no modals but on a different tab, go home
        setCurrentTab('home');
        window.history.pushState(null, '', window.location.href);
      } else {
        // Allow exit if on home and no modals
      }
    };

    // Initial push to ensure we have a history entry to pop
    window.history.replaceState({ app: 'active' }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalStack, currentTab]);

  const switchTab = useCallback((tab: ViewType) => {
    if (tab === currentTab && modalStack.length > 0) {
        // If clicking current tab, close all modals (Reset)
        setModalStack([]);
    } else {
        setCurrentTab(tab);
        setModalStack([]); // Switching tabs always clears modals
    }
  }, [currentTab, modalStack.length]);

  const openModal = useCallback((modalId: string, data?: any) => {
    setModalStack(prev => [...prev, modalId]);
    if (data) setModalData(data);
    // Push a state so back button works
    window.history.pushState({ modal: modalId }, '', window.location.href);
  }, []);

  const closeModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
    // We strictly don't call history.back() here to avoid fighting with the popstate listener
    // The UI updates based on state. If the user uses physical back button, popstate handles it.
    // If user clicks "X", we just update state.
  }, []);

  const closeAllModals = useCallback(() => {
    setModalStack([]);
  }, []);

  return (
    <NavigationContext.Provider value={{ 
        currentTab, 
        switchTab, 
        modalStack, 
        openModal, 
        closeModal, 
        closeAllModals,
        modalData 
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
