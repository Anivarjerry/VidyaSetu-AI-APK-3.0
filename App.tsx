
import React, { useState, useMemo, useEffect } from 'react';
import { LoginCard } from './components/LoginCard';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { GatekeeperDashboard } from './components/GatekeeperDashboard'; // Import Gatekeeper Dashboard
import { loginUser, updateUserToken } from './services/authService';
import { LoginRequest, Role } from './types';
import { ThemeLanguageProvider } from './contexts/ThemeLanguageContext';
import { requestForToken, onMessageListener } from './services/firebase';

const AppContent: React.FC = () => {
  // Sync Initialization: Immediate check from localStorage to prevent blink
  // Using useMemo to define state initial value as purely sync operation
  const [authData, setAuthData] = useState<{
    view: 'login' | 'dashboard' | 'admin';
    credentials: LoginRequest | null;
    userRole: Role | null;
    userName: string;
    userId?: string; // Add userId to state to pass to Gatekeeper
    schoolDbId?: string; // Add schoolDbId
  }>(() => {
    try {
      const savedCreds = localStorage.getItem('vidyasetu_creds');
      const savedRole = localStorage.getItem('vidyasetu_role');
      const savedName = localStorage.getItem('vidyasetu_name');
      const savedData = localStorage.getItem('vidyasetu_dashboard_data'); // Try to get cached dashboard data for IDs

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

  // --- FIREBASE NOTIFICATION INIT ---
  useEffect(() => {
    const initNotifications = async () => {
      const token = await requestForToken();
      if (token && authData.userId) {
        // Sync token to Supabase for this user
        console.log("FCM Token:", token);
        await updateUserToken(authData.userId, token);
      }
    };

    if (authData.view !== 'login') {
      initNotifications();
      // Listen for foreground messages
      onMessageListener()
        .then((payload: any) => {
          if (payload) {
             // Simple alert for now, can be replaced with a toast
             alert(`New Notification: ${payload.notification?.title}\n${payload.notification?.body}`);
          }
        })
        .catch(err => console.log('failed: ', err));
    }
  }, [authData.userId, authData.view]);

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
          
          // For Gatekeeper specifically, we need these immediately
          if (role === 'gatekeeper') {
             // We can store minimal data to allow immediate re-render
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
      window.history.pushState(null, '', window.location.href);
    } catch (e) {}
  };

  // Switch Case for immediate rendering based on initial synchronous state
  switch(authData.view) {
    case 'admin':
      return <AdminDashboard onLogout={handleLogout} userName={authData.userName} />;
    case 'dashboard':
      if (authData.credentials && authData.userRole) {
        // --- GATEKEEPER ROUTING ---
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
    <div className="fixed inset-0 bg-white dark:bg-dark-950">
      <AppContent />
    </div>
  </ThemeLanguageProvider>
);

export default App;
