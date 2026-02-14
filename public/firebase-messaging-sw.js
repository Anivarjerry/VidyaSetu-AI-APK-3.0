
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Config must match your firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyDgUJ_-mq-i2JgwyzVKwmocRso6IUxVnvw",
  authDomain: "vidyasetu-ai-adc1e.firebaseapp.com",
  projectId: "vidyasetu-ai-adc1e",
  storageBucket: "vidyasetu-ai-adc1e.firebasestorage.app",
  messagingSenderId: "109380207060",
  appId: "1:109380207060:web:a52990df319c6a7a5d5641"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/android/android-launchericon-192-192.png', // Correct icon path
    badge: '/android/android-launchericon-72-72.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
