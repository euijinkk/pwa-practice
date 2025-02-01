import { NextApiRequest, NextApiResponse } from "next";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Firebase Admin SDK 초기화
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { token } = req.body;
    console.log("Sending push to token:", token);

    if (!token) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    const message = {
      notification: {
        title: "백그라운드 테스트",
        body: "이 메시지는 백그라운드에서도 표시됩니다.",
      },
      data: {
        url: "/",
        time: new Date().toISOString(),
      },
      token,
    };

    console.log("Sending message:", message);
    const response = await getMessaging().send(message);
    console.log("Push notification sent successfully:", response);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send push notification",
      details: error,
    });
  }
}
