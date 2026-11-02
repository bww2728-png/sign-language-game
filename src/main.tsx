import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker so the app installed on the iOS home screen
// keeps working without a network connection.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Resolved against the document base so the worker is found from both
    // "/" and "/404" when the app is deployed under a sub-path.
    const swUrl = new URL("sw.js", document.baseURI).href;
    navigator.serviceWorker.register(swUrl).catch(() => undefined);
  });
}
