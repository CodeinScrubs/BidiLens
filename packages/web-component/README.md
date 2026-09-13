# @bidilens/web-component

An SSR-import-safe `<bidi-message>` custom element that preserves logical
source order and constructs semantic isolation nodes without `innerHTML`.

```bash
npm install @bidilens/web-component
```

```html
<bidi-message text="React یک کتابخانه جاوااسکریپت بسیار محبوب است."></bidi-message>
<script type="module">
  import '@bidilens/web-component/auto'; // explicit auto-registration entry
</script>
```

The normal package entry is side-effect-free. For explicit registries, import
`defineBidiMessageElement` from `@bidilens/web-component` and call it with the
target registry. The `/auto` and standalone entries are the only registration
side effects, so merely importing the component class never claims a global
element name. Run `pnpm --filter @bidilens/web-component example` after building;
the Node example's browser harness requires
`npm install --save-dev jsdom`.

LTR-only content under an LTR parent keeps the element free of BidiLens-owned
`dir`, data markers, inline styles, and child wrappers. Author-provided
presentation attributes and existing light-DOM markup are preserved. Add
`intervention="always"` to retain stable annotations for all content.

During intervention this component owns a **plain-text** rendering surface; it
does not preserve child markup in the displayed output. Returning to the no-op
path restores the original child nodes, including their event listeners and
mutable form values. Detaching interactive children can still affect focus and
custom-element lifecycle callbacks. Use the DOM adapter with explicit exclusions
for existing rich or interactive content instead of treating this as an editor.

For a no-build page, use the self-contained browser entry. It bundles core on
purpose, contains no bare package imports, and registers `<bidi-message>`:

```html
<bidi-message text="React یک کتابخانه جاوااسکریپت بسیار محبوب است."></bidi-message>
<script type="module"
  src="https://unpkg.com/@bidilens/web-component@0.4.0/dist/standalone.js"></script>
```

Applications with a bundler should prefer the side-effect-free normal entry
plus explicit registration when they manage custom-element lifecycles. Use
`/auto` for deliberate one-line registration. Both let an existing
`@bidilens/core` dependency be deduplicated.
