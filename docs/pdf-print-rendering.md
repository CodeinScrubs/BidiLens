# Bidirectional PDF Generation & Print Layout Guide

## Introduction

Generating server-side PDFs (such as invoices, official reports, and contracts) containing Arabic, Persian, or Hebrew text introduces specific challenges. PDFs store text as absolute glyph coordinate commands, making correct pre-render bidi layout and font embedding critical.

---

## 1. Headless Chromium PDF Generation

The most reliable approach to server-side bidirectional PDF generation is using headless Chromium via **Playwright** or **Puppeteer** with BidiLens:

```ts
import { chromium } from 'playwright';
import { renderBidiHtml } from '@bidilens/html';

async function generateInvoicePdf(invoiceHtml: string): Promise<Buffer> {
  // Pre-process HTML through BidiLens to ensure all blocks have explicit dir and bdi tags
  const processed = renderBidiHtml(invoiceHtml);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(processed.html, { waitUntil: 'networkidle' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  return pdfBuffer;
}
```

---

## 2. CSS Paged Media (`@page`) Mirroring

In printed books and double-sided documents (facing pages), margin mirroring must account for RTL book binding:

```css
/* In RTL books, binding is on the right for rectos (odd pages) */
@page :left {
  margin-left: 25mm;  /* Outside margin */
  margin-right: 15mm; /* Inside binding */
}

@page :right {
  margin-left: 15mm;  /* Inside binding */
  margin-right: 25mm; /* Outside margin */
}

@media print {
  body {
    direction: rtl;
  }
}
```

---

## 3. Font Embedding Checklist

To prevent PDF viewers from displaying disjointed Arabic characters or question marks:
1. **Always use TrueType (.ttf) or OpenType (.otf) fonts** containing complete `GSUB` and `GPOS` OpenType tables.
2. **Avoid WOFF2 in Node PDF pipelines** if using non-browser rasterizers (such as PDFKit).
3. **Verify text selection:** After exporting, select text in Adobe Acrobat or macOS Preview to verify that copying text copies the logical Unicode string rather than reversed visual glyphs.
