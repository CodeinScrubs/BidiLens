# ADR-007: Multi-Script Font Stack Fallback Strategy

## Status
Accepted

## Context
When rendering mixed-script text (e.g. Persian prose with embedded English code tokens), different font families often exhibit disparate x-heights, baseline descender depths, and line-height metrics. A naive font stack causes vertical jitter and uneven line spacing.

## Decision
1. **Script-Specific @font-face with `unicode-range`:** Define localized font faces partitioned by Unicode block (e.g. Arabic `U+0600-06FF`, Hebrew `U+0590-05FF`).
2. **CSS `font-size-adjust` Normalization:** Standardize visual glyph scale across font switches.
3. **Recommended System Font Stacks:**
   - Arabic/Persian: `Vazirmatn`, `Segoe UI`, `Geeza Pro`, `Noto Sans Arabic`, system-ui
   - Hebrew: `Heebo`, `Segoe UI`, `Arial Hebrew`, `Noto Sans Hebrew`, system-ui
   - Latin: `Inter`, system-ui, -apple-system, sans-serif

## Consequences
- Clean, jitter-free typography across mixed directional runs.
- Reduced font network payload by loading non-Latin glyphs on-demand.
