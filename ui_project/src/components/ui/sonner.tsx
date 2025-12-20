import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

// Simple wrapper that defaults to a dark theme. Avoid using next-themes here
// because this app doesn't include a ThemeProvider and calling useTheme
// led to runtime errors at startup.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={"dark"}
      className="toaster group"
      style={{
        background: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
      }}
      {...(props as ToasterProps)}
    />
  );
};

export { Toaster };
