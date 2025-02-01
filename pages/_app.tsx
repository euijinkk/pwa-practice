import type { AppProps } from "next/app";
import { useEffect } from "react";
import { firebase_app } from "@/firebase/firebase";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Firebase 초기화 확인
    if (firebase_app) {
      console.log("Firebase initialized successfully");
    }

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // PWA 서비스 워커 등록
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return <Component {...pageProps} />;
}
