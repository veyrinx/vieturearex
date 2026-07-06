import React from "react";
import { createRoot } from "react-dom/client";
// CSS chính chủ của Zalo UI (zmp-ui) — phải import trước CSS tuỳ biến.
import "zmp-ui/zaui.css";
import "./css/app.css";
import App from "./app";

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
