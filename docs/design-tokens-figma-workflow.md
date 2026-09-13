# Bidirectional Design Tokens & Figma-to-Code Workflows

## Overview

A robust bidirectional design system bridges design in Figma and code in React/Vue/HTML through **logical design tokens**. Rather than defining separate stylesheets for RTL and LTR, designers and engineers establish logical variables that adapt automatically to the computed direction.

---

## 1. Spatial Tokens: Logical Spacing and Radii

In Figma Variables and Style Dictionaries:

| Physical Token | Logical Token | CSS Mapping |
|---|---|---|
| `spacing-left` | `spacing-inline-start` | `margin-inline-start`, `padding-inline-start` |
| `spacing-right` | `spacing-inline-end` | `margin-inline-end`, `padding-inline-end` |
| `radius-top-left` | `radius-start-start` | `border-start-start-radius` |
| `radius-top-right` | `radius-start-end` | `border-start-end-radius` |
| `radius-bottom-left` | `radius-end-start` | `border-end-start-radius` |
| `radius-bottom-right` | `radius-end-end` | `border-end-end-radius` |

---

## 2. Icon Mirroring Strategy

Not all icons should be mirrored in RTL! Follow this classification:

### Categories to Mirror:
- **Directional Navigation:** Back / Forward arrows (← / →), chevron arrows.
- **Reading Progress:** Document lists, pagination controls.
- **Tools with Orientation:** Search magnifying glass (if handle angle implies reading hand).

### Categories NEVER to Mirror:
- **Symmetrical Icons:** Settings cog, close 'X', search if symmetrical, star.
- **Physical Objects:** Clock faces, battery indicators, camera icons.
- **Brand Logos:** Twitter, GitHub, Google logos.
- **Media Controls:** Play, Pause, Fast Forward (media playback flows left-to-right universally).

```css
/* Mirror only directional icons in RTL */
[dir="rtl"] .icon-directional {
  transform: scaleX(-1);
}
```

---

## 3. Typography Adjustments

Arabic and Persian fonts typically require **15-20% greater line-height** than Latin fonts due to vertical diacritic and ascender/descender heights:

```css
:root {
  --line-height-body-latin: 1.5;
  --line-height-body-arabic: 1.75;
}

[dir="rtl"][lang="fa"],
[dir="rtl"][lang="ar"] {
  line-height: var(--line-height-body-arabic);
}
```
