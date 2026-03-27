/**
 * Design tokens — Neo-Industrial palette (DESIGN.md).
 *
 * NOTE: This file is currently UNUSED (no imports). The app resolves
 * colors via CSS custom properties in globals.css. This file exists
 * as a typed reference for any future JS-side color logic (e.g.,
 * canvas rendering, chart configs, email templates).
 *
 * If you update globals.css palette, update this file to match.
 * Last synced: 2026-03-27 (lime #CAFF04 → gold #FFD700 migration).
 */

export const colors = {
  primary: "#FFD700",
  primaryHover: "#E5C200",
  primaryDim: "#C4A500",
  success: "#22C55E",
  warning: "#FF9F0A",
  danger: "#FF453A",
  info: "#5AC8FA",
} as const;

export const dark = {
  bg: "#000000",
  surface: "#0D0D0D",
  surfaceRaised: "#1A1A1A",
  border: "#2A2A2A",
  borderStrong: "#FFD700",
  text: "#F9F9F9",
  textSec: "#A0A0A0",
  textMuted: "#777777",
  inputBg: "#111111",
  shadow: "none",
  hardShadow: "4px 4px 0px #FFD700",
  primaryText: "#FFD700",
  primaryMuted: "rgba(255,215,0,0.08)",
} as const;

export const light = {
  bg: "#F9F9F9",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  border: "#D8D8D2",
  borderStrong: "#000000",
  text: "#000000",
  textSec: "#5A5A5A",
  textMuted: "#666666",
  inputBg: "#F0F0EA",
  shadow: "none",
  hardShadow: "4px 4px 0px #000000",
  primaryText: "#9E7C00",
  primaryMuted: "rgba(255,215,0,0.12)",
} as const;
