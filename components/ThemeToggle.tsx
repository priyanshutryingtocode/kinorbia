"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { ICON_BUTTON_CLASS } from "@/lib/uiClasses";

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
      <Icon key={theme} className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}