import { Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";

  const handleThemeChange = (nextTheme: "light" | "dark" | "warm") => {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  if (!mounted) {
    return (
      <div className="h-10 w-[132px] rounded-lg border border-border bg-card/60" aria-hidden="true" />
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-2 py-1 shadow-soft-sm">
      <span className="text-muted-foreground">
        {activeTheme === "dark" ? <Moon className="h-4 w-4" /> : activeTheme === "warm" ? <Palette className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
      <label htmlFor="theme-selector" className="sr-only">Theme</label>
      <select
        id="theme-selector"
        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        value={activeTheme}
        onChange={(event) => handleThemeChange(event.target.value as "light" | "dark" | "warm")}
        aria-label="Select theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="warm">Warm Orange</option>
      </select>
    </div>
  );
}
