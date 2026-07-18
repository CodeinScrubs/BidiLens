# Adoption Strategy

## Initial users

- open-source AI chat front ends;
- Markdown-based documentation and issue trackers;
- developer tools serving Persian, Arabic, Hebrew, Urdu, Kurdish, and mixed-language teams;
- model-evaluation platforms that need reproducible rendering.

## Integration sequence

1. Add `@bidilens/core` analytics without changing rendering.
2. Enable `rehypeBidi` or `applyBidi` in a staging environment.
3. Add code/identifier isolation and streaming stability.
4. Run the CLI in CI for bidi-control security findings.
5. Contribute failing examples to the public corpus.

## Success metrics

- zero direction flicker after the first strong token;
- no high-risk bidi controls entering source repositories undetected;
- at least 99% expected-direction accuracy on the maintained corpus;
- no injected controls in browser clipboard output by default;
- adapters add less than 5 ms for a typical 10,000-character answer on modern hardware;
- reproducible behavior across Chromium, Firefox, and Safari.
