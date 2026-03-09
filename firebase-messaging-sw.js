
// Scripts for firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCztVmtPxXPgiqn2nNNi44Aj-x1DO2fdgQ",
  authDomain: "avi-talk-34b45.firebaseapp.com",
  projectId: "avi-talk-34b45",
  storageBucket: "avi-talk-34b45.firebasestorage.app",
  messagingSenderId: "876798281404",
  appId: "1:876798281404:web:b95abb49e213fb1d58b2b9",
  measurementId: "G-6JKD0WJJTT"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Ensure you have an icon or remove this line
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
