
import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { getAuth, Auth } from "firebase/auth";

// Updated Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyCztVmtPxXPgiqn2nNNi44Aj-x1DO2fdgQ",
  authDomain: "avi-talk-34b45.firebaseapp.com",
  projectId: "avi-talk-34b45",
  storageBucket: "avi-talk-34b45.firebasestorage.app",
  messagingSenderId: "876798281404",
  appId: "1:876798281404:web:b95abb49e213fb1d58b2b9",
  measurementId: "G-6JKD0WJJTT"
};

const VAPID_KEY = "BAcmgCPf5OdeLkIWOtSDuCwATiyek8-qrcbtfZne4VDMAsSw9PsA2TTy31YNewMWnJtx-V6amCg-9kiYYyyqVEw";

let messagingInstance: Messaging | null = null;
let authInstance: Auth | null = null;

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
authInstance = getAuth(app);
authInstance.languageCode = 'en'; // Force English for SMS templates or auto-detect

const isSupported = () => 
  typeof window !== 'undefined' && 
  'Notification' in window && 
  'serviceWorker' in navigator && 
  'indexedDB' in window;

const getMessagingSafe = (): Messaging | null => {
  if (messagingInstance) return messagingInstance;
  if (!isSupported()) return null;

  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (e) {
    console.warn("Firebase Messaging is not supported or failed to initialize:", e);
    return null;
  }
};

export const requestForToken = async () => {
  const messaging = getMessagingSafe();
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      return currentToken;
    }
    return null;
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = getMessagingSafe();
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export { getMessagingSafe as messaging, authInstance as auth };
