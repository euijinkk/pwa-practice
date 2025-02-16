const CACHE_NAME = "static-cache-v3";

// 캐시할 정적 리소스
const STATIC_RESOURCES = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/file.svg",
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
  "/assets/images/logo192.png",
  "/assets/images/logo512.png",
  "/assets/images/maskable512.png",
  "/assets/images/desktopLogo.svg",
  "/assets/images/mobileLogo.svg",
  "/assets/images/tabletLogo.svg",
];

const CACHEABLE_API_ROUTES = ["/api/posts", "/api/products", "/todos"];

// 알림 옵션 설정
const notificationOptions = {
  body: "새로운 알림이 도착했습니다!",
  icon: "/assets/images/logo192.png",
  badge: "/assets/images/logo192.png",
  image: "/assets/images/logo192.png",
  vibrate: [200, 100, 200],
  tag: "new-notification",
  renotify: true,
  actions: [
    { action: "confirm", title: "확인", icon: "/assets/images/logo192.png" },
    { action: "cancel", title: "취소", icon: "/assets/images/logo192.png" },
  ],
};

// 푸시 알림 처리
self.addEventListener("push", function (event) {
  console.log("📩 Push Received:", event);

  const options = { ...notificationOptions };
  if (event.data) {
    options.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification("테스트 알림 제목", options)
  );
});

// 설치 시 정적 리소스 캐시
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching static resources");
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// 활성화 시 이전 캐시 정리
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate");
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log("[Service Worker] Removing old cache:", key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 네트워크 요청 처리
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  event.respondWith(
    // 1. 항상 네트워크 요청 먼저
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();

        // 2. 정적 리소스나 API 요청만 선택적으로 캐시
        // 정적 리소스 체크 - 정확한 경로이거나 특정 경로로 시작하는 경우
        if (
          STATIC_RESOURCES.includes(url.pathname) ||
          url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/styles/")
        ) {
          // 정적 리소스 캐시
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        } else if (
          CACHEABLE_API_ROUTES.some((route) => url.pathname.startsWith(route))
        ) {
          // API 캐시
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        console.log(event.request);
        // 3. 네트워크 실패시 캐시 확인
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") return caches.match("/");
          return null;
        });
      })
  );
});

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "confirm") {
    clients.openWindow("/");
  }
});
