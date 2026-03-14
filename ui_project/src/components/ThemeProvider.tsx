import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

// Use data-theme tokens so all components can switch palette in one place.
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      themes={["light", "dark", "warm"]}
      storageKey="theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
