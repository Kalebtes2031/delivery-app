// context/ThemeContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useSystemColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Palette {
  background: string;
  card: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  success: string;
  overlay: string;
}

export const palettes: Record<"light" | "dark", Palette> = {
  light: {
    background: "#FFFFFF",
    card: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#111111",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    primary: "#6750A4", // Match purple brand
    primarySoft: "rgba(103, 80, 164, 0.10)",
    onPrimary: "#FFFFFF",
    danger: "#F75555",
    success: "#16A34A",
    overlay: "rgba(0,0,0,0.4)",
  },
  dark: {
    background: "#0B0B0F",
    card: "#16161C",
    surface: "#1F1F27",
    text: "#F5F5F7",
    textMuted: "#9CA3AF",
    border: "#2A2A33",
    primary: "#6750A4", // Lighter purple for dark mode
  
primarySoft: "rgba(103, 80, 164, 0.12)",
    onPrimary: "#0B0B0F",
    danger: "#F87171",
    success: "#4ADE80",
    overlay: "rgba(0,0,0,0.6)",
  },
};

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedScheme = "light" | "dark";

export type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  isDark: boolean;
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "@app/theme-mode";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const scheme: ResolvedScheme =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const isDark = scheme === "dark";

  // Use native Appearance API to inform native and system components
  useEffect(() => {
    Appearance.setColorScheme(mode === "system" ? null : mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setMode(scheme === "dark" ? "light" : "dark");
  }, [scheme, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, isDark, colors: palettes[scheme], setMode, toggle, hydrated }),
    [mode, scheme, isDark, setMode, toggle, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used inside <AppThemeProvider>");
  return ctx;
}

export function useOptionalAppTheme(): ThemeContextValue | null {
  return useContext(ThemeContext) ?? null;
}
