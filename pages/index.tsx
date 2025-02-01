import { useState, useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/firebase/firebase";

export default function Home() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    // 현재 알림 권한 상태 확인
    setNotificationStatus(Notification.permission);

    // 이미 권한이 허용되어 있다면 토큰 가져오기
    if (Notification.permission === "granted" && messaging) {
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
        // 포그라운드에서도 알림 표시
        new Notification(payload.notification?.title || "알림", {
          body: payload.notification?.body,
          icon: "/assets/images/logo192.png",
        });
      });
    }
  }, []);

  const requestNotificationPermission = async () => {
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

  return (
    <main className="p-4">
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
