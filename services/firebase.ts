
import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

// Updated Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyDgUJ_-mq-i2JgwyzVKwmocRso6IUxVnvw",
  authDomain: "vidyasetu-ai-adc1e.firebaseapp.com",
  projectId: "vidyasetu-ai-adc1e",
  storageBucket: "vidyasetu-ai-adc1e.firebasestorage.app",
  messagingSenderId: "109380207060",
  appId: "1:109380207060:web:a52990df319c6a7a5d5641"
};

const VAPID_KEY = "BHICTM0s7nowrVwtsDP65Blrl0RKE7nC34L1z5mfxtt9WILgTnPuIrmc3q9H_HR6ojdE6CoqwAMcIzGL1f69XOM";

let messagingInstance: Messaging | null = null;

const isSupported = () => 
  typeof window !== 'undefined' && 
  'Notification' in window && 
  'serviceWorker' in navigator && 
  'indexedDB' in window;

const getMessagingSafe = (): Messaging | null => {
  if (messagingInstance) return messagingInstance;
  if (!isSupported()) return null;

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
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

export { getMessagingSafe as messaging };
