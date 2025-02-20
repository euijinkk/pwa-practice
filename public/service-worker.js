const DB_NAME = "pwa-store";
const DB_VERSION = 1;
const STORE_NAME = "resources";

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

let db = null;

// IndexedDB 초기화
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
  });
}

// 리소스 저장
async function saveResource(url, response) {
  if (!db) await initDB();

  // 먼저 데이터 준비
  const arrayBuffer = await response.clone().arrayBuffer();
  const responseData = {
    url: url,
    data: arrayBuffer,
    headers: Object.fromEntries(response.headers),
    status: response.status,
    statusText: response.statusText,
    type: response.type,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // 트랜잭션 이벤트 핸들러 설정
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("Transaction aborted"));

    try {
      store.put(responseData);
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

// 리소스 가져오기
async function getResource(url) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(url);

    request.onsuccess = () => {
      const data = request.result;
      if (!data) {
        resolve(null);
        return;
      }

      resolve(
        new Response(data.data, {
          status: data.status,
          statusText: data.statusText,
          headers: new Headers(data.headers),
          type: data.type,
        })
      );
    };

    request.onerror = () => reject(request.error);
  });
}

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

// 설치 시 정적 리소스 저장
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install");
  event.waitUntil(
    (async () => {
      try {
        // 순차적으로 리소스 캐싱
        for (const url of STATIC_RESOURCES) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await saveResource(url, response.clone());
              console.log(`Cached: ${url}`);
            }
          } catch (error) {
            console.error(`Failed to cache ${url}:`, error);
          }
        }
        await self.skipWaiting();
      } catch (error) {
        console.error("Installation failed:", error);
      }
    })()
  );
});

// 활성화
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate");
  event.waitUntil(self.clients.claim());
});

// 네트워크 요청 처리
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  event.respondWith(
    (async () => {
      try {
        // 1. 항상 네트워크 요청 먼저
        const response = await fetch(event.request);
        const responseClone = response.clone();

        // 2. 성공한 응답은 IndexedDB에 저장 (정적 리소스 제외)
        if (
          url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/styles/") ||
          CACHEABLE_API_ROUTES.some((route) => url.pathname.startsWith(route))
        ) {
          await saveResource(event.request.url, responseClone);
        }

        return response;
      } catch (error) {
        // 3. 네트워크 에러 && 오프라인일 때만 IndexedDB 확인
        if (!navigator.onLine) {
          console.log(
            "Offline mode - Fetching from IndexedDB:",
            event.request.url
          );
          const cachedResponse = await getResource(event.request.url);

          if (cachedResponse) {
            return cachedResponse;
          }

          // 4. 오프라인 폴백 처리
          if (event.request.mode === "navigate") {
            const rootResponse = await getResource("/");
            if (rootResponse) return rootResponse;
          } else if (event.request.destination === "image") {
            const offlineImage = await getResource(
              "/assets/images/logo192.png"
            );
            if (offlineImage) return offlineImage;
          }
        }

        throw error;
      }
    })()
  );
});

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "confirm") {
    clients.openWindow("/");
  }
});
