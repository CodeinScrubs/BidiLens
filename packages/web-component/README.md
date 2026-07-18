# @bidilens/web-component

A framework-independent `<bidi-message>` custom element. It uses the same
content-majority policy as the core package, preserves the source string, and
wraps technical ranges with semantic `bdi`/`code` elements.

```html
<bidi-message>React یک کتابخانه جاوااسکریپت بسیار محبوب است.</bidi-message>
<script type="module">
  import '@bidilens/web-component';
</script>
```
