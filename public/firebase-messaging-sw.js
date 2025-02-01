importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDzsHOQHLgcCtp_fb4cqzd6bR7nm-P4gnk",
  authDomain: "pwa-practice-7a7b7.firebaseapp.com",
  projectId: "pwa-practice-7a7b7",
  storageBucket: "pwa-practice-7a7b7.firebasestorage.app",
  messagingSenderId: "136394086022",
  appId: "1:136394086022:web:57341ea30ddfe5c3f4a307",
});

const messaging = firebase.messaging();

// 백그라운드 메시지 핸들링
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/assets/images/logo192.png",
    badge: "/assets/images/logo192.png",
    data: payload.data,
    requireInteraction: true,
    actions: [
      {
        action: "open",
        title: "열기",
      },
    ],
  };

  console.log("[firebase-messaging-sw.js] Showing notification:", {
    title: notificationTitle,
    options: notificationOptions,
  });
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// 알림 클릭 핸들링
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification clicked:", event);
  event.notification.close();

  // 알림 클릭 시 해당 URL로 이동
  const urlToOpen = new URL("/", self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // 이미 열린 탭이 있다면 포커스
        for (let client of windowClients) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // 없다면 새 탭 열기
        return clients.openWindow(urlToOpen);
      })
  );
});
