---
name: Atrevida Dark Luxury
colors:
    surface: "#030303"
    surface-dim: "#0a0a0a"
    surface-bright: "#0c0c0c"
    surface-container-lowest: "#030303"
    surface-container-low: "#0a0a0a"
    surface-container: "#0c0c0c"
    surface-container-high: "#0a0a0a"
    surface-container-highest: "#0c0c0c"
    on-surface: "#fafafa"
    on-surface-variant: "rgba(245,245,245,0.65)"
    inverse-surface: "#fafafa"
    inverse-on-surface: "#030303"
    outline: "rgba(255,255,255,0.05)"
    outline-variant: "rgba(146,39,143,0.35)"
    surface-tint: "#EC008C"
    primary: "#EC008C"
    on-primary: "#fafafa"
    primary-container: "rgba(236,0,140,0.1)"
    on-primary-container: "#EC008C"
    inverse-primary: "#92278F"
    secondary: "#92278F"
    on-secondary: "#fafafa"
    secondary-container: "rgba(146,39,143,0.1)"
    on-secondary-container: "#92278F"
    tertiary: "#14AEEF"
    on-tertiary: "#fafafa"
    tertiary-container: "rgba(20,174,239,0.1)"
    on-tertiary-container: "#14AEEF"
    error: "#ff4d4d"
    on-error: "#fafafa"
    error-container: "rgba(255,77,77,0.1)"
    on-error-container: "#ff4d4d"
    primary-fixed: "#EC008C"
    primary-fixed-dim: "#92278F"
    on-primary-fixed: "#fafafa"
    on-primary-fixed-variant: "#EC008C"
    secondary-fixed: "#92278F"
    secondary-fixed-dim: "#14AEEF"
    on-secondary-fixed: "#fafafa"
    on-secondary-fixed-variant: "#92278F"
    tertiary-fixed: "#14AEEF"
    tertiary-fixed-dim: "#FFE600"
    on-tertiary-fixed: "#fafafa"
    on-tertiary-fixed-variant: "#14AEEF"
    background: "#030303"
    on-background: "#fafafa"
    surface-variant: "rgba(255,255,255,0.05)"
typography:
    display-lg:
        fontFamily: Geist
        fontSize: "clamp(2.5rem, 5vw, 3.5rem)"
        fontWeight: "800"
        lineHeight: 1.15
        letterSpacing: -0.02em
    headline-lg:
        fontFamily: Geist
        fontSize: "clamp(2rem, 5vw, 3rem)"
        fontWeight: "800"
        lineHeight: 1.1
        letterSpacing: -0.02em
    headline-md:
        fontFamily: Geist
        fontSize: 1.25rem
        fontWeight: "700"
        lineHeight: 1.2
    body-lg:
        fontFamily: Geist
        fontSize: 1rem
        fontWeight: "400"
        lineHeight: 1.6
    body-md:
        fontFamily: Geist
        fontSize: 0.875rem
        fontWeight: "400"
        lineHeight: 1.5
    label-sm:
        fontFamily: Geist
        fontSize: 0.68rem
        fontWeight: "600"
        lineHeight: 1
        letterSpacing: 0.1em
rounded:
    sm: 8px
    DEFAULT: 12px
    md: 12px
    lg: 20px
    xl: 24px
    full: 9999px
spacing:
    unit: 8px
    container-padding: 24px
    card-gap: 16px
    section-margin: 80px
    glass-padding: 24px
components:
    glass-card-standard:
        backgroundColor: "#0c0c0c"
        backgroundOpacity: 0.6
        textColor: "{colors.on-surface}"
        rounded: "{rounded.lg}"
        padding: "{spacing.glass-padding}"
        border: "1px solid rgba(255,255,255,0.05)"
        backdropFilter: "blur(10px)"
    glass-card-elevated:
        backgroundColor: "#0c0c0c"
        backgroundOpacity: 0.9
        textColor: "{colors.on-surface}"
        rounded: "{rounded.xl}"
        padding: "{spacing.glass-padding}"
        border: "1px solid rgba(255,255,255,0.07)"
        backdropFilter: "blur(24px)"
    button-primary:
        backgroundColor: "linear-gradient(135deg, {colors.primary}, {colors.secondary})"
        textColor: "{colors.on-primary}"
        typography: "{typography.label-sm}"
        rounded: "{rounded.full}"
        height: 48px
        padding: 0 32px
    button-primary-hover:
        transform: "translateY(-2px)"
        boxShadow: "0 10px 40px rgba(236,0,140,0.55)"
    button-ghost:
        backgroundColor: "transparent"
        textColor: "{colors.on-surface}"
        typography: "{typography.label-sm}"
        rounded: "{rounded.full}"
        border: "1px solid rgba(255,255,255,0.15)"
    input-field:
        backgroundColor: "rgba(0,0,0,0.6)"
        textColor: "{colors.on-surface}"
        typography: "{typography.body-md}"
        rounded: "{rounded.full}"
        padding: 12px 20px
        height: 48px
        border: "1px solid {colors.outline-variant}"
    badge-standard:
        backgroundColor: "rgba(236,0,140,0.08)"
        textColor: "{colors.primary}"
        typography: "{typography.label-sm}"
        rounded: "{rounded.full}"
        padding: 6px 16px
        border: "1px solid rgba(236,0,140,0.3)"
    table-container:
        backgroundColor: "rgba(15,15,15,0.6)"
        textColor: "{colors.on-surface}"
        rounded: "{rounded.lg}"
        border: "1px solid rgba(146,39,143,0.15)"
        backdropFilter: "blur(10px)"
---

<!-- @format -->

## Brand & Style

This design system centers on a Dark Luxury Glassmorphism aesthetic tailored for Atrevida, a premium tourism and wellness brand. The brand personality is bold, modern, and energetic, blending high-contrast dark surfaces with vibrant gradient accents to evoke sophistication and trust. The UI relies on a "dark-glass" approach: near-black backgrounds provide depth, while semi-transparent glass surfaces with blur effects create layered, tactile interfaces that highlight vibrant brand gradients.

## Colors

The color strategy prioritizes high contrast and brand vibrancy against dark surfaces.

- **Brand Gradient**: Linear gradient using Primary Magenta (#EC008C), Secondary Purple (#92278F), Tertiary Electric Blue (#14AEEF), and Accent Yellow (#FFE600) for CTAs, accents, and decorative borders.
- **Surface Colors**: Near-black tones (#030303, #0a0a0a, #0c0c0c) form the base canvas, with semi-transparent variants for glass surfaces.
- **Text**: High-contrast white/near-white (#fafafa, rgba(245,245,245,0.65)) ensures legibility across dark surfaces and blurred glass.
- **Semantic Colors**: Error states use #ff4d4d, success uses #10b981, with low-opacity fills to maintain the glass effect.

## Typography

The system uses **Geist** (loaded via next/font/google) as the primary typeface for its clean, geometric sans-serif forms, with **Poppins** as a secondary font for admin interfaces.

- **Responsive Scaling**: Headings use `clamp()` for fluid sizing across viewports, with 800 weight for hero/section titles.
- **Legibility**: Body text uses 400 weight with 1.5-1.6 line height; labels use 600 weight with uppercase styling and letter spacing for clarity.
- **Effects**: Gradient text clips (`background-clip: text`) apply brand gradients to headings, with animated shimmer effects for visual interest.

## Layout & Spacing

The layout follows an 8px base grid for consistent rhythm.

- **Section Spacing**: Generous vertical padding (6-8rem) creates clear content separation, with horizontal padding of 1.5rem (24px) standard.
- **Containers**: Max-widths of 1400px (hero), 1280px (main content), 700px (forms) for optimal readability.
- **Grid Gaps**: 1.5-2.5rem for card grids, 0.5-1.25rem for inline elements.

## Elevation & Depth

Depth is achieved through glass morphism and layered blur effects.

- **Glass Stack**:
    - **Base**: Near-black solid backgrounds with radial gradient "orbs" for ambient depth.
    - **Standard Glass**: `backdrop-filter: blur(10px)`, `background: rgba(12,12,12,0.6)` with 1px white borders.
    - **Elevated Glass**: `backdrop-filter: blur(24px)`, `background: rgba(12,12,12,0.9)` for modals/focal cards.
- **Shadows**: Tinted box shadows using brand colors (e.g., `rgba(236,0,140,0.3)`) for soft, premium elevation.
- **Hover Effects**: Subtle `translateY(-2px to -8px)` transforms with enhanced shadows for interactive elements.

## Shapes

The shape language uses rounded forms to contrast with sharp gradient accents.

- **Pill Shapes**: Buttons, inputs, and badges use `9999px` (pill) radius for a soft, tactile feel.
- **Cards**: 20px radius for standard cards, 24px for elevated cards.
- **Small Elements**: 8px radius for chips, 12px for inputs/secondary cards.

## Components

### Glass Containers

Standard cards use 10px blur with 0.6 opacity; elevated cards use 24px blur with 0.9 opacity. All glass elements feature 1px solid borders with brand or white tints, plus inset top highlights to simulate light refraction.

### Action Elements

Primary buttons use the brand gradient (magenta-to-purple) with pill radius, white text, and 600 weight. Hover states add upward transform and amplified brand-tinted shadows. Ghost buttons use transparent backgrounds with subtle white borders.

### Inputs & Interaction

Inputs are pill-shaped with dark semi-transparent backgrounds and purple-tinted borders. Focus states highlight borders with primary magenta and add spread shadows. Interactive list items use subtle hover tints without solid color changes.

### Typography Application

Hero titles use 800 weight with gradient clips and shimmer animations. Body text uses 400 weight with high contrast against dark surfaces. Labels use uppercase 600 weight with letter spacing for clear hierarchy.
