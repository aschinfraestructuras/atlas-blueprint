import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";
import "./i18n/index.ts";

posthog.init("phc_SGpgxNeh1qd4DXDAayMeP3VPPJ1BOKwUYu4VZjKLiYL", {
  api_host: "https://eu.i.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: true,
  capture_pageleave: true,
});

createRoot(document.getElementById("root")!).render(<App />);
