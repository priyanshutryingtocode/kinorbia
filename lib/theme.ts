"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// The key the inline script in app/layout.tsx reads, and the one it falls back
// to `prefers-color-scheme` when absent. Duplicated there because that script
// runs before this module exists; the two must not drift.
export const THEME_STORAGE_KEY = "kinorbia-theme";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

// The live source of truth is the `data-theme` attribute, because the inline
// script in app/layout.tsx has already written it before React ever runs.
// useSyncExternalStore is the right shape for that: subscribing to the DOM beats
// copying the value into state inside an effect, which renders once with the
// wrong theme and causes a visible flash on the toggle.
function subscribe(listener: () => void) {
  listeners.add(listener);

  // Follow the OS while the reader has expressed no preference of their own, so
  // a system theme change is picked up without a reload.
  const media = window.matchMedia("(prefers-color-scheme: light)");

  function onSystemChange() {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      return;
    }

    if (stored !== "light" && stored !== "dark") {
      applyTheme(media.matches ? "light" : "dark");
      notify();
    }
  }

  media.addEventListener("change", onSystemChange);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
  };
}

// `app/globals.css` puts the dark palette on `:root`, so dark is what the
// server rendered and what the first client snapshot must report to match.
function getServerSnapshot(): Theme {
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme) {
  applyTheme(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing and blocked storage both throw. The theme still applies
    // for this page view; it just will not be remembered.
  }

  notify();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    setTheme(readTheme() === "light" ? "dark" : "light");
  }, []);

  return { theme, setTheme, toggleTheme };
}