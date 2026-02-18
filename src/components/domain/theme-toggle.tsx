"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-full" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2 w-full h-8 px-2 transition-all duration-150 border-2 hover:opacity-80"
      style={{
        borderColor: "var(--border)",
      }}
    >
      {isDark ? (
        <Sun className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
      ) : (
        <Moon className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
      )}
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
        }}
      >
        {isDark ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}
