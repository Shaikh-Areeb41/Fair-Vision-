import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Toaster } from "./components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/ThemeProvider";
import "./styles/globals.css";
import "./styles/index.css";
import axios from 'axios';

// This sets the "Base URL" for the entire app automatically
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Bootstrap persisted theme early to avoid incorrect initial paint.
const persistedTheme = localStorage.getItem("theme");
if (persistedTheme === "light" || persistedTheme === "dark" || persistedTheme === "warm") {
  document.documentElement.setAttribute("data-theme", persistedTheme);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider disableTransitionOnChange={false}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
