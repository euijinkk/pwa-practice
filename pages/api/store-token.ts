import { NextApiRequest, NextApiResponse } from "next";

// 실제로는 데이터베이스에 저장해야 합니다
let fcmTokens: string[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  // 토큰이 이미 있는지 확인
  if (!fcmTokens.includes(token)) {
    fcmTokens.push(token);
  }

  res.status(200).json({ message: "Token stored successfully" });
}
