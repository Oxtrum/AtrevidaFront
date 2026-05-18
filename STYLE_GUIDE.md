# Banexcoin Frontend Style Guide

*Generated on 2026-05-17*  

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Radii](#spacing--radii)
5. [Easing & Animations](#easing--animations)
6. [Core UI Components](#core-ui-components)
   - [Header & AppShell](#header--appshell)
   - [Sidebar Navigation](#sidebar-navigation)
   - [Cards](#cards)
   - [Buttons](#buttons)
   - [Inputs & Forms](#inputs--forms)
   - [Tables & Data Lists](#tables--data-lists)
   - [Progress & Loading Indicators](#progress--loading-indicators)
   - [Tooltips, Popovers & Hover Cards](#tooltips-popovers--hover-cards)
7. [Utility Classes & Global Styles](#utility-classes--global-styles)
8. [Accessibility & Reduced‑Motion](#accessibility--reduced-motion)
9. [Scrollbars](#scrollbars)
10. [Future Dashboard Integration](#future-dashboard‑integration)

---

## Design Tokens

All visual values are defined as CSS custom properties in **`frontend/src/styles/global.css`**. They are the single source of truth for the entire UI.

```css
:root {
  --radius: 0.625rem;                     /* Base border‑radius */
  --ease-banex: cubic-bezier(0.16,1,0.3,1);
  --ease-banex-soft: cubic-bezier(0.22,1,0.36,1);
  /* Light‑mode palette */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ...many more colour tokens – see section below */
}

.dark {
  /* Dark‑mode overrides */
  --background: oklch(0.18 0.015 280); /* #171724 */
  --foreground: oklch(0.985 0 0);
  /* ... */
}
```

These tokens drive every component (cards, buttons, inputs, etc.) via the Tailwind `var(--color‑…)` mapping defined later in the same file.

---

## Color System

The design system defines a **brand‑centric palette** based on OKLCH (perceptual lightness, chroma, hue). Two theme variations exist – **light** (default) and **dark** (via `.dark`). The following table lists the variable, its purpose, and the concrete values for both themes.

| Variable | Light (default) | Dark (override) | Usage |
|----------|----------------|----------------|-------|
| `--primary` | `oklch(0.665 0.205 35)` | `oklch(0.645 0.21 33)` | Primary CTA, brand orange |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(1 0 0)` | Text on primary background |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.28 0.015 280)` | Secondary surfaces / hover panels |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.26 0.015 280)` | Soft backgrounds, disabled UI |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.30 0.015 280)` | Accent surfaces |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.645 0.21 33)` | Error / danger (re‑uses orange) |
| `--border` | `oklch(0.922 0 0)` | `oklch(0.32 0.015 280)` | Border colour |
| `--input` | `oklch(0.922 0 0)` | `oklch(0.30 0.015 280)` | Input background / outline |
| `--ring` | `oklch(0.665 0.205 35)` | `oklch(0.732 0.180 55)` | Focus ring colour |
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.20 0.015 280)` | Sidebar background |
| `--chart‑1 … --chart‑5` | Various brand & success hues | Same (adjusted for dark) | Chart series colours |

All colour tokens are re‑exposed as Tailwind‑compatible utilities via the `@theme inline` block (e.g. `--color-primary`, `--color-background`). The mapping enables usage such as `bg-primary`, `text-foreground`, `border-border`, etc.

---

## Typography

*Font families* are loaded from Google Fonts in `AppShell.astro`:

```html
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap" />
```

- **Sans‑serif** (body, headings): `Manrope`
- **Monospace** (code, terminal): `JetBrains Mono`

The base `body` style sets:

```css
font-family: 'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
font-feature-settings: "rlig" 1, "calt" 1;   /* ligatures */
```

### Heading scale (Tailwind utilities used)
| Element | Tailwind class | Size / Weight |
|---------|----------------|--------------|
| `h1` (page title) | `text-2xl md:text-3xl font-bold` | 24‑30 px |
| `h2` (section) | `text-xl font-semibold` | 20 px |
| `h3` | `text-lg font-medium` | 18 px |
| `p` (body) | `text-base md:text-sm` | 16‑14 px |

### Small utilities
- `.text-balance` – improves line‑break balance (via `text‑balance` plugin).
- `.font-mono` – applies the monospaced stack.

---

## Spacing & Radii

- Base **spacing unit** follows Tailwind’s default (0.25 rem = 4 px).
- Global `--radius` = `0.625rem` (10 px). Variant radii are derived:
  - `--radius-sm` = `calc(var(--radius) - 4px)` → 6 px
  - `--radius-md` = `calc(var(--radius) - 2px)` → 8 px
  - `--radius-lg` = `var(--radius)` → 10 px
  - `--radius-xl` = `calc(var(--radius) + 4px)` → 14 px

---

## Easing & Animations

**Easing functions** are declared once:
```css
--ease-banex: cubic-bezier(0.16, 1, 0.3, 1);
--ease-banex-soft: cubic-bezier(0.22, 1, 0.36, 1);
```
These are used for all UI transitions (hover, focus, entry animations).

### Keyframe library (global.css)
| Name | Description | Typical duration |
|------|-------------|-------------------|
| `pageEnter` | Fade‑in + slide‑up + blur removal for page containers | `0.5s` |
| `softReveal` | Gentle upward reveal used on sidebars, main content | `0.58s` |
| `ambientDrift` | Slow vertical drift + scaling for decorative glows | `9s` (infinite) |
| `floatMark` | Tiny vertical bounce for brand logo | `6s` (infinite) |
| `lineSweep` | Horizontal line‑draw for separators | `0.75s` |
| `softSheen` | Light “sheen” slide across cards on hover | `1.1s` |
| `rowSettle` | Staggered row entrance for tables | `0.42s` |
| `progressBreath` | Subtle pulsating filter on progress circles | `2.2s` (infinite) |
| `skeletonPulse` | Opacity pulse for skeleton loaders | `1.8s` (infinite) |
| `endpointPulse` | Pulse animation for chart points | `2.2s` (infinite) |
| `barGrow` / `barShimmer` | Grow‑and‑shimmer effect for tier bars | `1s` / `2.4s` |

**Usage pattern** (example from a card):
```html
<div class="hero-panel hover:shadow-[…] transition-[border-color,box-shadow,transform] duration-450 ease-banex">
  …
</div>
```
Hover adds `softSheen` via `::after` pseudo‑element.

---

## Core UI Components

### Header & AppShell
- Implemented in `frontend/src/layouts/AppShell.astro`.
- **Sticky header** (`.app-header`) with a subtle background gradient:
  ```css
  .app-header {
    border‑bottom: 1px solid var(--color-border‑/50);
    background: linear-gradient(to bottom, var(--color‑background)/95%, var(--color‑background)/80%, var(--color‑background)/60%);
    backdrop‑blur: 8px;
  }
  ```
- Contains a **breadcrumb line** (primary hue) and a **title** using `bg‑clip‑text` for a gradient text effect.
- Desktop badge shows current section with `bg‑primary/5` and `border‑primary/15`.

### Sidebar Navigation
- Markup lives in the `<aside>` block of `AppShell.astro`.
- Uses **nav‑item** groups with hover cards (`.nav-hover-card`).
- Active item gets a **left accent bar** (`bg-primary` at left edge) and a highlighted icon background.
- Hover card appears with a smooth opacity/transform transition (`duration-180` ms) and a backdrop blur.

### Cards
- Component: `frontend/src/components/ui/card.tsx` (`data-slot="card"`).
- **Base styles** (Tailwind):
  ```css
  .card {
    display: flex; flex‑direction: column; gap: 1.5rem;
    border-radius: var(--radius‑lg);
    border: 1px solid rgb(var(--color‑border) / 0.06);
    background: linear-gradient(180deg, oklch(0.24 0.015 280 / 0.7) 0%, oklch(0.20 0.015 280 / 0.7) 100%;
    box‑shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px -12px rgba(0,0,0,0.4);
    transition: transform 0.34s var(--ease-banex), border‑color 0.34s var(--ease-banex), box‑shadow 0.34s var(--ease-banex), background 0.34s var(--ease-banex);
  }
  .card:hover {
    transform: translateY(-2px);
    border‑color: rgba(255,255,255,0.10);
    box‑shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 44px -30px rgba(0,0,0,0.92);
  }
  ```
- Hover adds a **sheen** pseudo‑element (`::after`) with `softSheen` animation.

### Buttons
- Defined in `frontend/src/components/ui/button.tsx` using **class‑variance‑authority** (`cva`).
- **Variants**:
  - `default` → `.banex-primary-button` (gradient background, elevated shadow, hover lift).
  - `outline` → transparent pill with subtle gradient and backdrop blur.
  - `secondary`, `destructive`, `ghost`, `link` – each with its own colour tokens.
- **Sizes**: `xs`, `sm`, `default`, `lg`, plus `icon` variants.
- **Interaction**: transition across `color, background‑color, border‑color, box‑shadow, transform, filter` with the defined easings.

### Inputs & Forms
- Component: `frontend/src/components/ui/input.tsx`.
- Base style (excerpt):
  ```css
  .input {
    height: 2.25rem; width: 100%;
    border: 1px solid var(--color‑input);
    background: transparent;
    padding: 0 0.75rem;
    border‑radius: var(--radius‑md);
    transition: color, box‑shadow, border‑color 0.2s var(--ease-banex);
    focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/25;
    aria-invalid:border-destructive aria-invalid:ring-destructive/20;
  }
  ```
- Disabled inputs receive `pointer-events:none` and reduced opacity.

### Tables & Data Lists
- Table component lives in `frontend/src/components/ui/table.tsx` (not shown but follows Shadcn pattern). Global styles include row animation:
  ```css
  [data-slot="table-body"] [data-slot="table-row"] { animation: rowSettle 0.42s var(--ease-banex-soft) backwards; }
  ```
- Hover on a row draws a left accent using `border‑left: 3px solid var(--color‑brand‑hover)/0.65`.

### Progress & Loading Indicators
- Progress indicator (`[data-slot="progress-indicator"]`) uses a **breathing filter** animation (`progressBreath`) and an inner shimmering bar (`barShimmer`).
- Skeleton loaders (`.skeleton-block`) use `skeletonPulse` to pulse opacity.

### Tooltips, Popovers & Hover Cards
- Hover cards (`.nav-hover-card`) are hidden by default (`opacity:0; transform: translateY(-50%) translateX(-6px)`). On `.nav-item:hover .nav-hover-card` they become visible with a short transition (`duration-180`).
- The card background uses `bg-card/96` and `backdrop-blur-xl` for a glass‑like effect.

---

## Utility Classes & Global Styles

- **`.banex-primary-button`** – custom gradient button with animated glow.
- **`.ambient-glow`** – large radial gradient placed at the top of the page for depth.
- **`.hero-panel`** – generic container for interactive panels; includes hover border‑color, box‑shadow, and translateY lift.
- **`.stagger > *`** – applies incremental `fadeUp` animation for entrance staggering.
- **`.chart-endpoint`** – animated point for sparkline charts.
- **`.skeleton-block`**, **`.tier-bar-fill`**, **`.chart‑end‑point`** – visual feedback utilities used in dashboards.

All utilities respect the custom easing and radii tokens defined at the top of `global.css`.

---

## Accessibility & Reduced‑Motion

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- Focus rings are `focus-visible:ring-3` with a semi‑transparent primary colour.
- Interactive elements (`button`, `a[href]`, `[role="button"]`) always show `cursor: pointer`.
- Form inputs use `:focus-visible` styles instead of `:focus` to avoid visual noise for keyboard navigation.

---

## Scrollbars

Custom themed scrollbars are defined globally:
```css
* { scrollbar-width: thin; scrollbar-color: rgb(var(--color‑panel‑line‑strong) / 0.7) transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background-color: rgb(var(--color‑panel‑line‑strong) / 0.6); border-radius: 9999px; transition: background-color 0.2s var(--ease-banex); }
::-webkit-scrollbar-thumb:hover { background-color: rgb(var(--color‑brand‑hover) / 0.55); }
```
The colours adapt automatically via the token system, ensuring consistent dark‑mode appearance.

---

## Future Dashboard Integration

When building new dashboards, follow these guidelines:
1. **Use the design tokens** – reference CSS variables or Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-lg`, etc.) rather than hard‑coding colours.
2. **Leverage pre‑built components** (`Card`, `Button`, `Input`, `Table`) from `src/components/ui`. They already apply the correct theme, animations, and accessibility.
3. **Add custom gradients or glows** only through the provided utility classes (`.ambient-glow`, `.hero-panel`).
4. **Respect animation duration** – keep UI snappy (`< 500 ms`) and use the defined easings.
5. **Test in both light and dark mode** – the `.dark` class on `<html>` toggles the dark variables; ensure all custom colours reference the token system.
6. **Maintain accessibility** – always provide `focus-visible` styles and honour users’ reduced‑motion preferences.

---

*End of Style Guide*  

(Generated automatically by Claude Code on 2026‑05‑17. Keep this file version‑controlled and update it whenever a new token, component variant, or animation is added.)
