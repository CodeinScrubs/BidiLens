# @bidilens/web-component

An SSR-import-safe `<bidi-message>` custom element that preserves logical
source order and constructs semantic isolation nodes without `innerHTML`.

```bash
npm install @bidilens/web-component
```

```html
<bidi-message text="React یک کتابخانه جاوااسکریپت بسیار محبوب است."></bidi-message>
<script type="module">
  import '@bidilens/web-component'; // registers <bidi-message> in browsers
</script>
```

For explicit registries, import `defineBidiMessageElement`. The package marks
its registration entry as a package side effect so bundlers retain documented
side-effect imports. Run `pnpm --filter @bidilens/web-component example` after
building; the Node example's browser harness requires
`npm install --save-dev jsdom`.

For a no-build page, use the self-contained browser entry. It bundles core on
purpose, contains no bare package imports, and registers `<bidi-message>`:

```html
<bidi-message text="React یک کتابخانه جاوااسکریپت بسیار محبوب است."></bidi-message>
<script type="module"
  src="https://unpkg.com/@bidilens/web-component@0.1.0/dist/standalone.js"></script>
```

Applications with a bundler should prefer the normal package entry above so
their existing `@bidilens/core` dependency can be deduplicated.
