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

---

## 3. Typography

The typography strategy is a dialogue between **Epilogue** (Headings) and **Inter/Fira Code** (Utility).

*   **Display & Headline (Epilogue):** Set with tight letter-spacing (-2% to -4%) and heavy weights. These function as structural anchors. Use "All Caps" for sub-headlines to evoke a sense of urgency and command.
*   **Body (Inter):** Clean, highly legible sans-serif. Used for long-form explanation where clarity is paramount.
*   **Labels & Data (Space Grotesk / Fira Code):** Use monospaced or high-tech sans-serif for "system status," timestamps, and code-based data. This reinforces the "automation" personality.

---

## 4. Elevation & Depth

In this system, depth is not an illusion of light—it is an illusion of **stacking**.

*   **The Hard-Shadow Principle:** Forbid blurred shadows. Depth is achieved via an offset solid block (e.g., 4px down, 4px right) using the `#000000` color. This creates a "sticker" effect that makes components feel tactile.
*   **Tonal Layering:** To differentiate nested content, use the `surface-container` scale. A "lowest" tier background indicates a recessed area (like a terminal input), while a "highest" tier indicates a floating element.
*   **The "Ghost Border" Fallback:** For secondary information containers, use the `outline-variant` at 20% opacity. This provides a structural hint without competing with the primary 4px black borders.
*   **Glassmorphism for Overlays:** When modals or tooltips appear over the grid, use a semi-transparent `surface` with a heavy `backdrop-filter: blur(10px)`. Frame this with a solid 2px black border to maintain the brutalist aesthetic.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background, 2px solid black border, 4px hard black shadow. Text in `on-primary-fixed` (Black).
*   **Secondary:** Black background, white text, no shadow.
*   **States:** On hover, the hard shadow should "retract" (0px offset) to simulate the button being physically pressed into the page.

### Cards
*   **Rule:** No rounded corners (`0px`).
*   **Style:** Use a 2px black border and a solid yellow or black shadow offset. 
*   **Separation:** Forbid dividers. Use `surface-container-low` backgrounds for card headers and `surface-container-lowest` for card bodies to create internal hierarchy.

### Input Fields
*   **Default:** `surface-container-lowest` background, 2px black border.
*   **Focus:** Border increases to 4px with a primary yellow "glow" (a 0-blur solid offset).
*   **Monospaced Input:** All user input should use `Fira Code` or `Space Grotesk` to feel like "data entry" into an AI engine.

### Chips & Tags
*   **Action Chips:** High contrast black-on-yellow. 
*   **Status Chips:** Use `secondary-container` with monospaced labels. Sharp corners only.

### Additional Component: "The Status Bar"
A dedicated thin strip (24px height) at the top or bottom of containers using `primary` or black background with scrolling monospaced text for real-time "system logs" or "automation counts."

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme scale. Make your headlines uncomfortably large and your labels surgically small.
*   **Do** lean into the grid. Align elements strictly to the underlying grid pattern.
*   **Do** use "Hard Bracketing." Wrap important icons or numbers in square brackets `[ 01 ]` to reinforce the technical theme.

### Don't
*   **Don't** use border-radius. Even a 2px radius breaks the mechanical precision of the system.
*   **Don't** use soft transitions. Interactions should be "snappy" (0.1s duration or instant) rather than "graceful."
*   **Don't** use centered layouts for everything. Use left-aligned "Editorial" layouts with wide margins to create a high-end magazine feel.
*   **Don't** use generic iconography. Use thick-stroke (2pt minimum) geometric icons that match the border weight of the UI.