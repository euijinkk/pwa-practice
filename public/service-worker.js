const CACHE_NAME = "speechtime-v1";

// 캐시할 기본 리소스
const PRECACHE_RESOURCES = [
  "/",
  "/manifest.json",
  "/assets/images/desktopLogo.svg",
  "/assets/images/mobileLogo.svg",
  "/assets/images/tabletLogo.svg",
  // Next.js 정적 파일들
  "/_next/static/chunks/main.js",
  "/_next/static/chunks/webpack.js",
  "/_next/static/chunks/pages/_app.js",
  "/_next/static/chunks/pages/index.js",
];

// 설치 시 기본 리소스 캐시
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// 활성화 시 이전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith("speechtime-"))
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// 네트워크 요청 처리
self.addEventListener("fetch", (event) => {
  // Next.js 페이지 요청은 네트워크 우선으로 처리
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }

  // 정적 리소스는 캐시 우선으로 처리
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        // 유효한 응답이 아니면 그대로 반환
        if (!response || response.status !== 200) {
          return response;
        }
        // 응답을 캐시에 저장
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
