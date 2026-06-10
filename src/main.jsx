import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  const isWebHttp = window.location.protocol.startsWith("http") && !window.location.hostname.includes("androidplatform.net");
  if (isWebHttp) {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log("Unregistered service worker in dev mode to prevent caching.");
            }
          });
        }
      });
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          caches.delete(key).then(() => {
            console.log("Cleared cache storage in dev mode:", key);
          });
        });
      });
    } else {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
      });
    }
  }
}


