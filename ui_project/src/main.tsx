import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Toaster } from "./components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/ThemeProvider";
import "./styles/index.css";
import axios from 'axios';

// This sets the "Base URL" for the entire app automatically
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Force dark mode on app load
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange={false} enableSystem={false}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
