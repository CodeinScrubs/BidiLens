# Bidirectional Text Rendering in Canvas 2D, WebGL & Three.js

## Introduction

Unlike standard HTML/DOM elements where the browser automatically applies the Unicode Bidirectional Algorithm (UAX #9), low-level graphics APIs (HTML5 Canvas 2D, WebGL, WebGPU, and Three.js) require manual coordination for right-to-left layout and glyph shaping.

---

## 1. HTML5 Canvas 2D Context

Modern browsers support `ctx.direction` on the Canvas 2D rendering context:

```ts
import { detectDirection } from '@bidilens/core';

function renderTextOnCanvas(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const dir = detectDirection(text);
  ctx.direction = dir === 'rtl' ? 'rtl' : 'ltr';
  ctx.textAlign = dir === 'rtl' ? 'right' : 'left';
  ctx.font = '24px Vazirmatn, sans-serif';
  ctx.fillText(text, x, y);
}
```

---

## 2. WebGL and Three.js 3D Text Meshes

In WebGL pipelines using Multi-channel Signed Distance Fields (MSDF):
1. **Pre-shape cursive clusters:** Arabic and Persian text must be shaped (via HarfBuzz WASM) prior to generating 3D glyph quad vertices.
2. **Reorder bidirectional runs:** Use BidiLens `segmentDirectionalRuns(text)` to position character glyphs in correct visual coordinate space.
3. **Anchor text pivots:** For RTL 3D labels, anchor mesh bounding box origin to the top-right corner.
