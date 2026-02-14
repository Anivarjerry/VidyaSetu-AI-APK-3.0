
import { useState, useEffect, useCallback } from 'react';

type ViewType = 'home' | 'profile' | 'action' | 'manage';

interface NavigationState {
  currentTab: ViewType;
  modalStack: string[]; // Stores IDs of open modals like ['attendance', 'history']
}

export const useSmartNavigation = (initialTab: ViewType = 'home') => {
  const [currentTab, setCurrentTab] = useState<ViewType>(initialTab);
  const [modalStack, setModalStack] = useState<string[]>([]);

  // Push a new state to browser history whenever our internal state changes important context
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // The browser back button was pressed.
      // We prevent the default 'back' and handle it internally.
      
      if (modalStack.length > 0) {
        // If modals are open, close the top one
        setModalStack(prev => prev.slice(0, -1));
      } else if (currentTab !== 'home') {
        // If on a tab other than home, go home
        setCurrentTab('home');
      } else {
        // If on home with no modals, let the browser exit/minimize (standard Android behavior)
        // We don't interfere here.
      }
    };

    // Push a "dummy" state so that the back button event is intercepted by JS
    // instead of immediately closing the PWA/Tab.
    window.history.pushState({ appState: 'active' }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalStack, currentTab]);

  const navigateTab = useCallback((tab: ViewType) => {
    if (tab === currentTab) {
       // Tapping active tab resets the stack (Native-like feel)
       setModalStack([]);
    } else {
       setCurrentTab(tab);
       setModalStack([]); // Switching tabs usually clears modal history in standard apps
    }
  }, [currentTab]);

  const openModal = useCallback((modalId: string) => {
    setModalStack(prev => [...prev, modalId]);
    // Push history state to ensure back button catches this
    window.history.pushState({ modal: modalId }, ''); 
  }, []);

  const closeModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
    // We don't strictly need history.back() here because state change triggers re-render,
    // but proper history management requires syncing. 
    // Simplified: Just update state, the popstate listener handles the physical button.
  }, []);

  const closeAllModals = useCallback(() => {
    setModalStack([]);
  }, []);

  // Helper to check if a specific modal is the *topmost* active one (for Z-index handling)
  const isModalOpen = (id: string) => modalStack.includes(id);
  const isTopModal = (id: string) => modalStack[modalStack.length - 1] === id;

  return {
    currentTab,
    navigateTab,
    modalStack,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    isTopModal
  };
};
