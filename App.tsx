
import React, { useState, useEffect } from 'react';
import { LoginCard } from './components/LoginCard';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { GatekeeperDashboard } from './components/GatekeeperDashboard'; 
import { loginUser, updateUserToken } from './services/authService';
import { LoginRequest, Role } from './types';
import { ThemeLanguageProvider } from './contexts/ThemeLanguageContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'; // NEW IMPORT
import { requestForToken, onMessageListener } from './services/firebase';
import { SyncManager } from './services/syncManager';

// Inner component to access Context hooks
const AppContent: React.FC = () => {
  const { handlePhysicalBack } = useNavigation(); // Get the master handler

  // --- MASTER HISTORY LISTENER ---
  useEffect(() => {
      const onPopState = (event: PopStateEvent) => {
          // Pass control to the Navigation Context to decide logic (Close Modal or Switch Tab)
          handlePhysicalBack();
      };

      // Push initial state so we have something to pop
      window.history.replaceState({ view: 'home' }, '', window.location.href);
      window.addEventListener('popstate', onPopState);
      
      return () => window.removeEventListener('popstate', onPopState);
  }, [handlePhysicalBack]);

  const [authData, setAuthData] = useState<{
    view: 'login' | 'dashboard' | 'admin';
    credentials: LoginRequest | null;
    userRole: Role | null;
    userName: string;
    userId?: string; 
    schoolDbId?: string;
  }>(() => {
    try {
      const savedCreds = localStorage.getItem('vidyasetu_creds');
      const savedRole = localStorage.getItem('vidyasetu_role');
      const savedName = localStorage.getItem('vidyasetu_name');
      const savedData = localStorage.getItem('vidyasetu_dashboard_data'); 

      let userId = '';
      let schoolDbId = '';

      if (savedData) {
          const parsed = JSON.parse(savedData);
          userId = parsed.user_id;
          schoolDbId = parsed.school_db_id;
      }

      if (savedCreds && savedRole) {
        return {
          view: savedRole === 'admin' ? 'admin' : 'dashboard',
          credentials: JSON.parse(savedCreds),
          userRole: savedRole as Role,
          userName: savedName || '',
          userId,
          schoolDbId
        };
      }
    } catch (e) {
      console.error("Auth init error:", e);
    }
    return { view: 'login', credentials: null, userRole: null, userName: '' };
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // --- SPLASH SCREEN REMOVAL (Guaranteed) ---
  useEffect(() => {
      const timer = setTimeout(() => {
          const splash = document.getElementById('splash-screen');
          if (splash) {
              splash.style.transition = 'opacity 0.5s ease-out';
              splash.style.opacity = '0';
              setTimeout(() => splash.remove(), 500);
          }
      }, 1500);
      return () => clearTimeout(timer);
  }, []);

  // --- INITIALIZE OFFLINE SYNC ---
  useEffect(() => {
      SyncManager.init();
  }, []);

  // --- FIREBASE NOTIFICATION INIT ---
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initNotifications = async () => {
      // 1. Register Service Worker
      if ('serviceWorker' in navigator) {
          try {
              await navigator.serviceWorker.register('./firebase-messaging-sw.js');
          } catch (err) {
              console.warn('Service Worker Registration Warning:', err);
          }
      }

      // 2. Request Token and Update Database
      try {
          const token = await requestForToken();
          if (token && authData.userId && authData.userRole) {
            // Only update if token is new or not in local storage to save DB calls
            const lastToken = localStorage.getItem('fcm_token_last');
            if (lastToken !== token) {
                await updateUserToken(authData.userId, token, authData.userRole);
                localStorage.setItem('fcm_token_last', token);
            }
          }
      } catch (err) {
          console.error("Notification Init Error:", err);
      }

      // 3. Listen for Foreground Messages
      unsubscribe = onMessageListener((payload: any) => {
          if (payload && payload.notification) {
              const { title, body } = payload.notification;
              
              // Show browser notification if permission is granted
              if (Notification.permission === 'granted') {
                  new Notification(title || 'VidyaSetu Alert', {
                      body: body,
                      icon: '/android/android-launchericon-192-192.png',
                      badge: '/android/android-launchericon-192-192.png',
                      tag: 'vidyasetu-alert'
                  });
              } else {
                  // Fallback for UI if needed
                  console.log("Foreground Notification Received:", payload);
              }
          }
      });
    };

    if (authData.view !== 'login' && authData.userId) {
      initNotifications();
    }

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [authData.userId, authData.view, authData.userRole]);

  const handleLogin = async (creds: LoginRequest) => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await loginUser(creds);
      const role = response.user_role || response.role || 'teacher';

      if (response.status === 'success') {
          const name = response.user_name || '';
          localStorage.setItem('vidyasetu_creds', JSON.stringify(creds));
          localStorage.setItem('vidyasetu_role', role);
          localStorage.setItem('vidyasetu_name', name);
          
          if (role === 'gatekeeper') {
             localStorage.setItem('vidyasetu_dashboard_data', JSON.stringify({
                 user_id: response.user_id,
                 school_db_id: response.school_db_id
             }));
          }
          
          setAuthData({
            view: role === 'admin' ? 'admin' : 'dashboard',
            credentials: creds,
            userRole: role,
            userName: name,
            userId: response.user_id,
            schoolDbId: response.school_db_id
          });
      } else {
          setLoginError(response.message || 'Invalid credentials');
      }
    } catch (error) {
      setLoginError('An unexpected error occurred. Please check internet.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuthData({ view: 'login', credentials: null, userRole: null, userName: '' });
    try {
      // Clean history on logout
      window.history.replaceState(null, '', window.location.href);
    } catch (e) {}
  };

  switch(authData.view) {
    case 'admin':
      return <AdminDashboard onLogout={handleLogout} userName={authData.userName} />;
    case 'dashboard':
      if (authData.credentials && authData.userRole) {
        if (authData.userRole === 'gatekeeper') {
            return <GatekeeperDashboard onLogout={handleLogout} schoolId={authData.schoolDbId || ''} userId={authData.userId || ''} />;
        }
        return <Dashboard credentials={authData.credentials} role={authData.userRole} userName={authData.userName} onLogout={handleLogout} />;
      }
      return <LoginCard onSubmit={handleLogin} isLoading={isLoggingIn} error={loginError} />;
    default:
      return <LoginCard onSubmit={handleLogin} isLoading={isLoggingIn} error={loginError} />;
  }
};

const App: React.FC = () => (
  <ThemeLanguageProvider>
    <NavigationProvider>
        <div className="fixed inset-0 h-full w-full bg-white dark:bg-dark-950 flex flex-col">
          <AppContent />
        </div>
    </NavigationProvider>
  </ThemeLanguageProvider>
);

export default App;
