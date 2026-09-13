# Bidirectional Micro-Frontends & Shadow DOM Encapsulation

## Architecture Overview

In a micro-frontend architecture, independently deployed frontend applications frequently coexist on the same page. When an RTL shell hosts LTR micro-apps (or vice versa), directional state must be explicitly managed to prevent cross-boundary style contamination.

---

## 1. Shadow DOM Direction Inheritance

Standard DOM elements inherit the `dir` attribute from ancestor nodes. However, elements inside a **closed Shadow DOM** or dynamically appended custom elements may not react to host mutations without explicit observers:

```ts
class BidiMicroAppElement extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    
    // Inherit direction from host page or default
    const hostDir = this.closest('[dir]')?.getAttribute('dir') || 'auto';
    
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          direction: ${hostDir};
          text-align: start;
        }
      </style>
      <div id="app-root" dir="${hostDir}">
        <slot></slot>
      </div>
    `;
  }
}
customElements.define('bidi-micro-app', BidiMicroAppElement);
```

---

## 2. Cross-App Direction Synchronization

Use a lightweight custom event or global store to broadcast language/direction changes:

```ts
window.addEventListener('bidilens:direction-change', (event: any) => {
  const { direction } = event.detail;
  document.querySelectorAll('bidi-micro-app').forEach((app) => {
    app.setAttribute('dir', direction);
  });
});
```
