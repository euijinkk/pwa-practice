import { NextApiRequest, NextApiResponse } from "next";
import admin from "firebase-admin";

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
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
    console.log("Received token:", token);

    if (!token) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    const message = {
      notification: {
        title: "테스트 알림",
        body: "이것은 테스트 푸시 알림입니다!",
      },
      token
    };

    console.log("Sending message:", message);
    const response = await admin.messaging().send(message);
    console.log("Push notification sent successfully:", response);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send push notification",
      details: error
    });
  }
}
