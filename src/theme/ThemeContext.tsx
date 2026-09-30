import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's choice: light, dark, or follow the OS ("system"). */
  theme: Theme;
  /** What is actually applied right now (system resolved to light/dark). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

// Must match the storage key + values used by the no-flash script in index.html.
const THEME_STORAGE_KEY = "theme";

function readStoredTheme(storageKey: string): Theme {
  try {
    const t = localStorage.getItem(storageKey);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "dark" || (theme === "system" && systemPrefersDark())
    ? "dark"
    : "light";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /**
   * Controlled mode: the current theme, owned by the consumer. When set, the
   * provider reads/writes NO localStorage and keeps no internal choice —
   * `setTheme` only calls `onThemeChange`, and the consumer feeds the new
   * value back in. The provider still resolves "system" and applies
   * `data-theme` to `<html>` (it stays the single writer of that attribute).
   * Do not switch between controlled and uncontrolled during the lifetime of
   * the provider.
   */
  theme?: Theme;
  /**
   * Called with the requested theme whenever `setTheme` is invoked (e.g. by
   * `AppearanceSettings`) — in controlled mode this is the only effect of `setTheme`;
   * in uncontrolled mode it fires in addition to the internal update.
   */
  onThemeChange?: (theme: Theme) => void;
  /**
   * Uncontrolled mode only: the localStorage key for persisting the choice.
   * Default "theme". Keep it in sync with the no-flash script in index.html.
   */
  storageKey?: string;
}

export function ThemeProvider({
  children,
  theme: controlledTheme,
  onThemeChange,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const isControlled = controlledTheme !== undefined;
  const [uncontrolledTheme, setUncontrolledTheme] = useState<Theme>(() =>
    isControlled ? "system" : readStoredTheme(storageKey),
  );
  const theme = isControlled ? controlledTheme : uncontrolledTheme;
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(theme),
  );

  const setTheme = useCallback(
    (next: Theme) => {
      if (!isControlled) {
        setUncontrolledTheme(next);
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          /* storage unavailable */
        }
      }
      onThemeChange?.(next);
    },
    [isControlled, onThemeChange, storageKey],
  );

  // Apply the resolved theme to <html data-theme> and, while on "system", keep
  // it in sync with OS changes.
  useEffect(() => {
    const apply = () => {
      const r = resolve(theme);
      setResolvedTheme(r);
      document.documentElement.dataset.theme = r;
    };
    apply();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the theme context. Must be used within <ThemeProvider>. */
// Provider + hook live together by design; this disables the fast-refresh-only
// lint that prefers them in separate files.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
