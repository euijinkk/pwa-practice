import { useState, useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/firebase/firebase";

export default function Home() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationPermission>("default");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 현재 알림 권한 상태 확인
    if ("Notification" in window) {
      setNotificationStatus(Notification.permission);
    }

    // 이미 권한이 허용되어 있다면 토큰 가져오기
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      messaging
    ) {
      getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
      })
        .then((currentToken) => {
          if (currentToken) {
            console.log("Existing FCM Token:", currentToken);
            setFcmToken(currentToken);
          }
        })
        .catch((err) => {
          console.error("Failed to get FCM token:", err);
        });
    }

    // 포그라운드 메시지 핸들링
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log("Received foreground message:", payload);
        if ("Notification" in window) {
          new Notification(payload.notification?.title || "알림", {
            body: payload.notification?.body,
            icon: "/assets/images/logo192.png",
          });
        }
      });
    }

    // PWA 설치 프롬프트 이벤트 처리
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("beforeinstallprompt", e);
      e.preventDefault();
      setDeferredPrompt(e);
      // 3초 후에 설치 배너 표시
      setTimeout(() => {
        setShowInstallBanner(true);
      }, 3000);
    });

    window.addEventListener("appinstalled", () => {
      console.log("appinstalled");
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      console.log("PWA was installed");
    });
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);

      if (permission === "granted") {
        if (!messaging) {
          throw new Error("Messaging is not initialized");
        }

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
        });

        console.log("New FCM Token:", token);
        setFcmToken(token);

        await fetch("/api/store-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const sendTestPush = async () => {
    if (!fcmToken) {
      console.error(
        "FCM token not available. Please request notification permission first."
      );
      return;
    }

    try {
      const response = await fetch("/api/send-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: fcmToken }),
      });
      const data = await response.json();
      console.log("Push sent:", data);
    } catch (error) {
      console.error("Error sending push:", error);
    }
  };

  const installPWA = async () => {
    if (!deferredPrompt) {
      console.log("PWA 설치가 지원되지 않거나 이미 설치되어 있습니다.");
      return;
    }

    try {
      const result = await deferredPrompt.prompt();
      console.log("Install prompt result:", result);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch (error) {
      console.error("PWA 설치 중 오류:", error);
    }
  };

  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/todos/1")
      .then((response) => response.json())
      .then((json) => console.log(json));
  }, []);

  return (
    <main className="p-4">
      {/* 설치 배너 */}
      {showInstallBanner && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-lg border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/assets/images/logo192.png"
                alt="앱 아이콘"
                className="w-12 h-12 rounded-xl"
              />
              <div>
                <h3 className="font-bold text-lg">PWA Practice App</h3>
                <p className="text-gray-600">
                  더 나은 경험을 위해 앱을 설치하세요
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="px-4 py-2 text-gray-600"
                onClick={() => setShowInstallBanner(false)}
              >
                나중에
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                onClick={installPWA}
              >
                앱 설치하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-x-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={requestNotificationPermission}
            disabled={notificationStatus === "granted"}
          >
            {notificationStatus === "granted" ? "알림 허용됨" : "알림 동의"}
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={sendTestPush}
            disabled={!fcmToken}
          >
            테스트 푸시 발송
          </button>
        </div>

        {fcmToken && (
          <div className="mt-4">
            <h3 className="font-bold">FCM Token:</h3>
            <p className="mt-2 p-2 bg-gray-100 rounded break-all font-mono text-sm">
              {fcmToken}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
