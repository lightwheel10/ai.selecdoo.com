# Design System Strategy: Neo-Industrial Automation

## 1. Overview & Creative North Star

### The Creative North Star: "The Mechanical Architect"
This design system rejects the "softness" of modern SaaS. It embraces a "Neo-Industrial" aesthetic that communicates raw power, high-velocity automation, and technical precision. By combining the unapologetic structural honesty of Neo-Brutalism with high-end editorial layouts, we create a visual language that feels less like a website and more like a high-performance command center.

The design breaks the standard "template" look through:
*   **Intentional Asymmetry:** Off-setting heavy shadows and overlapping containers to create kinetic energy.
*   **High-Contrast Scale:** Utilizing extreme variance between massive Display headings and technical Monospaced labels.
*   **Structural Honesty:** Using thick, visible borders and hard corners to frame information as "modules" rather than "components."

---

## 2. Colors

The palette is anchored by the tension between absolute black and high-energy yellow, creating an environment of maximum readability and "action-oriented" focus.

*   **Primary (#FFD700):** Our "Action Signal." Reserved for high-priority interactive elements and key brand highlights.
*   **Background / Neutrals:** We oscillate between a sterile, grid-patterned **Off-white (#F9F9F9)** and a deep, authoritative **Black (#000000)**.
*   **The "No-Line" Rule for Sections:** While individual elements use thick borders, global sectioning is defined by color blocks. Do not use 1px lines to separate a header from a hero; use a hard shift from a white grid background to a solid black container.
*   **Surface Hierarchy & Nesting:** Use `surface-container` tiers to create "cut-out" effects. A `surface-container-high` card should feel like it has been physically placed onto the `surface` background.
*   **Signature Textures:** Incorporate a subtle 20px x 20px light-grey grid on white backgrounds to mimic architectural blueprints. For main CTAs, use a sharp 45-degree linear gradient from `primary` to `primary-container` to add a metallic "industrial" sheen.

### Semantic Colors (not in original spec — added during implementation)

*   **Error / Destructive (#FF453A):** Used for error messages, validation feedback, and destructive dev-only actions. Background tint: `rgba(255,69,58,0.08)`, border: `rgba(255,69,58,0.3)`.
*   **Primary Text:** Light mode `#9E7C00` (dark gold), dark mode `#FFD700` (gold). Used for accent labels and links.
*   **Primary Muted:** Light `rgba(255,215,0,0.12)`, dark `rgba(255,215,0,0.08)`. Background tint for badges/chips.
*   **Primary Border:** Light `rgba(255,215,0,0.35)`, dark `rgba(255,215,0,0.25)`. Subtle border for secondary containers.

### Implementation: Scoped CSS Variable Overrides

The Neo-Industrial palette is applied **only** to public-facing pages (landing, login, signup) via a `.landing-page` CSS class on the root `<div>`. This class overrides core CSS variables (`--primary`, `--background`, `--foreground`, `--border`, etc.) so standard Tailwind utilities (`bg-primary`, `text-foreground`, `border-border`) resolve to the new palette automatically.

The **dashboard** retains the original palette (`--primary: #CAFF04`, `--background: #F5F5F0` / `#0A0A0A`) and is **not affected** by the `.landing-page` scope.

**Two border tiers within `.landing-page`:**
*   `--border` (soft): `#D8D8D2` light / `#2A2A2A` dark — for separators, internal dividers, and components that render inside both light and dark sections (e.g., the ProductDemoVideo component).
*   `--border-strong`: `#000000` light / `#FFD700` dark — for neo-brutalist card/button borders per §5.

---

## 3. Typography

The typography strategy is a dialogue between **Epilogue** (Headings) and **Inter/Fira Code** (Utility).

*   **Display & Headline (Epilogue):** Set with tight letter-spacing (-2% to -4%) and heavy weights. These function as structural anchors. Use "All Caps" for sub-headlines to evoke a sense of urgency and command.
*   **Body (Inter):** Clean, highly legible sans-serif. Used for long-form explanation where clarity is paramount.
*   **Labels & Data (Space Mono):** Monospaced font for "system status," timestamps, code-based data, and all user input fields. This reinforces the "automation" personality.

### Implementation: Font Variables

| Variable | Font | Used On |
|---|---|---|
| `--font-display` | Epilogue | Headlines everywhere (previously Sora, migrated 2026-03-27) |
| `--font-body` | Inter | Body text everywhere (previously DM Sans, migrated 2026-03-27) |
| `--font-mono` | Space Mono | Labels, inputs, data everywhere |

---

## 4. Elevation & Depth

In this system, depth is not an illusion of light—it is an illusion of **stacking**.

*   **The Hard-Shadow Principle:** Forbid blurred shadows. Depth is achieved via an offset solid block (e.g., 4px down, 4px right) using the `#000000` color. This creates a "sticker" effect that makes components feel tactile.
*   **Tonal Layering:** To differentiate nested content, use the `surface-container` scale. A "lowest" tier background indicates a recessed area (like a terminal input), while a "highest" tier indicates a floating element.
*   **The "Ghost Border" Fallback:** For secondary information containers, use the `outline-variant` at 20% opacity. This provides a structural hint without competing with the primary 4px black borders.
*   **Glassmorphism for Overlays:** When modals or tooltips appear over the grid, use a semi-transparent `surface` with a heavy `backdrop-filter: blur(10px)`. Frame this with a solid 2px black border to maintain the brutalist aesthetic.

### Implementation: Shadow Variables

| Variable | Light Mode | Dark Mode |
|---|---|---|
| `--hard-shadow` | `4px 4px 0px #000000` | `4px 4px 0px #FFD700` |
| `--section-alt-shadow` | `4px 4px 0px #FFD700` | `4px 4px 0px #FFD700` |

---

## 5. Components

### Buttons
*   **Primary:** `primary` background, 2px solid `border-strong` border, 4px hard shadow. Text in black.
*   **Secondary:** Transparent background, muted text, 2px soft border, no shadow.
*   **States:** On active, the element translates 2px right + 2px down and the shadow is removed (simulates pressing into the page). All transitions `0.1s`.

### Cards
*   **Rule:** No rounded corners (`0px`).
*   **Style:** Use a 2px `border-strong` border and a `--hard-shadow` offset.
*   **Separation:** Forbid dividers. Use background color differences for internal hierarchy.

### Input Fields
*   **Default:** `--input` background, 2px `--border` (soft) border.
*   **Focus:** Border increases to 4px with `--primary` color. Padding adjusts inward by 2px to prevent layout shift.
*   **Monospaced Input:** All user input uses `--font-mono` (Space Mono).

### Chips & Tags
*   **Action Chips:** High contrast black-on-yellow.
*   **Status Chips:** Use `secondary-container` with monospaced labels. Sharp corners only.

### Additional Component: "The Status Bar"
A dedicated thin strip (28px height) at the top of the landing page using `primary` background with infinitely scrolling monospaced text showing real-time system metrics. Uses bracket notation: `[ SYS ] Stores monitored: 63`.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme scale. Make your headlines uncomfortably large and your labels surgically small.
*   **Do** lean into the grid. Align elements strictly to the underlying grid pattern.
*   **Do** use "Hard Bracketing." Wrap important icons or numbers in square brackets `[ 01 ]` to reinforce the technical theme.

### Don't
*   **Don't** use border-radius. Even a 2px radius breaks the mechanical precision of the system.
*   **Don't** use soft transitions. Interactions should be "snappy" (0.1s duration or instant) rather than "graceful."
*   **Don't** use centered layouts for everything. Use left-aligned "Editorial" layouts with wide margins to create a high-end magazine feel. Exception: login/signup forms are centered (standard auth UX pattern).
*   **Don't** use generic iconography. Use thick-stroke (2pt minimum) geometric icons that match the border weight of the UI.

---

## 7. Section Color Blocks (Landing Page)

The landing page alternates between main background and contrasting "alt" sections per the No-Line Rule:

| Section | Background | Text |
|---|---|---|
| Hero | `--background` (#F9F9F9 / #000) | `--foreground` |
| Video Demo | `--section-alt-bg` (#0A0A0A / #0A0A0A) | `--section-alt-fg` |
| Features | `--background` | `--foreground` |
| How It Works | `--section-alt-bg` | `--section-alt-fg` |
| CTA | 45° gold gradient | Black |
| Footer | `--background` | `--muted-foreground` |

---

## 8. Pages Using This Design System

| Page | Class | Status |
|---|---|---|
| Landing (`/`) | `.landing-page` | Implemented |
| Login (`/login`) | `.landing-page` | Implemented |
| Signup (`/signup`) | `.landing-page` | Implemented |
| Workspace Select (`/workspace-select`) | `.landing-page` | Implemented |
| Dashboard (`/dashboard/*`) | None (uses original palette) | Not planned |
