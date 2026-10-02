"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { ICON_BUTTON_CLASS } from "@/lib/uiClasses";

// Sits in the Navbar next to the search and account controls and matches their
// 40px square icon-button shape, so the header row keeps its rhythm.
//
// The label names the theme being switched *to*. `aria-pressed` is deliberately
// not used: this is a single toggle rather than a latching state.
const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Switch to light theme", Icon: Sun },
  { value: "dark", label: "Switch to dark theme", Icon: Moon },
];

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { label, Icon } = OPTIONS.find((option) => option.value !== theme) ?? OPTIONS[0];

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={ICON_BUTTON_CLASS}
      aria-label={label}
      title={label}
    >
      {/* Keyed on the theme so the icon swaps on click rather than on mount,
          keeping the first paint consistent with what the inline script in
          app/layout.tsx already applied. */}
      <Icon key={theme} className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}