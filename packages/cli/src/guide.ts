// Deliberately static: guide never inspects a project, runs an installer, or
// fetches remote content. Keep examples executable in the packed-consumer gate.
interface IntegrationGuide {
  target: string;
  title: string;
  docs: string;
  install: string | null;
  compatibility: string;
  steps: string[];
  example?: { filename: string; code: string };
  rollback: string;
}

const repository = 'https://github.com/CodeinScrubs/BidiLens/blob/main/';
const npmCompatibility = 'ESM; Node.js >=22.12 for server/CLI use; current standards-based browsers.';

const guides: readonly IntegrationGuide[] = [
  {
    target: 'react',
    title: 'React plain-text messages',
    docs: `${repository}packages/react/README.md`,
    install: 'npm install @bidilens/react',
    compatibility: `Existing React 18 or 19 application. ${npmCompatibility}`,
    steps: [
      'Replace one plain-text message component with <Message text={answer} />. Do not wrap an existing Markdown component with it.',
      'Pass the actual parent direction, especially during SSR; the example defaults to an LTR host.',
      'textAlign is independent of direction. Remove the example left alignment if your design uses natural start alignment.',
      'For streaming accumulated text, see StreamingBidiMessage in the package guide and signal completed when the response ends.',
      'Next.js App Router: keep this component in a client boundary (it can still be server-rendered).'
    ],
    example: {
      filename: 'Message.tsx',
      code: `'use client';
import { BidiMessage } from '@bidilens/react';

export function Message({ text, inheritedDirection = 'ltr' }: {
  text: string;
  inheritedDirection?: 'ltr' | 'rtl';
}) {
  return <BidiMessage text={text} inheritedDirection={inheritedDirection}
    style={{ textAlign: 'left' }} />;
}
`
    },
    rollback: 'Render the original message component again. Stored text and application state need no migration.'
  },
  {
    target: 'dom',
    title: 'Existing, application-owned DOM',
    docs: `${repository}packages/dom/README.md`,
    install: 'npm install @bidilens/dom',
    compatibility: `Browser DOM with MutationObserver. ${npmCompatibility}`,
    steps: [
      'Call mountBidi(messagesElement) after mounting one message container containing p, li, headings, or other supported blocks.',
      'The observer applies immediately, then handles updates. Do not also call applyBidi for the initial render.',
      'Keep React/Vue/Svelte-managed children under their framework adapter. Do not observe the entire document or an editor.',
      'This recipe rejects containers inside or containing editable controls. Keep editor surfaces outside the container, including during updates.',
      'No global stylesheet is installed. Use your existing scoped text-align CSS; direction and inline isolation still work.'
    ],
    example: {
      filename: 'mount-bidi.ts',
      code: `import { observeBidi, restoreBidi } from '@bidilens/dom';

export function mountBidi(root: HTMLElement) {
  const skipSelector = 'input, textarea, select, [contenteditable], [role="textbox"]';
  if (root.closest(skipSelector) || root.querySelector(skipSelector)) {
    throw new Error('Mount BidiLens on an editor-free message container.');
  }
  const watcher = observeBidi(root, { skipSelector });
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    watcher.disconnect();
    restoreBidi(root);
  };
}
`
    },
    rollback: 'Call the returned cleanup function before unmounting or handing DOM ownership back to your application. Repeated calls are no-ops; mount only once per root at a time.'
  },
  {
    target: 'html',
    title: 'Plain text to semantic HTML',
    docs: `${repository}packages/html/README.md`,
    install: 'npm install @bidilens/html',
    compatibility: npmCompatibility,
    steps: [
      'Call renderMessage(text) where your app serializes plain-text answers. It is not an existing-HTML or Markdown parser.',
      'Only insert the returned HTML at the intended message boundary; do not concatenate unescaped user input afterward.',
      'Pass the actual inherited direction when embedding in an RTL host. Keep alignment in your own scoped CSS.'
    ],
    example: {
      filename: 'render-message.ts',
      code: `import { renderBidiHtml } from '@bidilens/html';

export function renderMessage(text: string, inheritedDirection: 'ltr' | 'rtl' = 'ltr') {
  return renderBidiHtml(text, { inheritedDirection }).html;
}
`
    },
    rollback: 'Restore the previous escaped plain-text serializer. Keep the original source string as your data model.'
  },
  {
    target: 'markdown-it',
    title: 'Markdown-It message rendering',
    docs: `${repository}packages/markdown/README.md`,
    install: 'npm install @bidilens/markdown',
    compatibility: `Existing Markdown-It 13, 14, or 15 application. ${npmCompatibility}`,
    steps: [
      'Register markdownItBidi once on the parser for your message surface, alongside your existing plugins.',
      'The example returns a dedicated parser; create it once, then call parser.render(markdown) for each message.',
      'If starting without a parser, also install markdown-it. Version 15 includes types; 13/14 need their matching @types/markdown-it.',
      'Keep raw HTML disabled for untrusted Markdown. This plugin is not an HTML sanitizer; audit other parser plugins separately.',
      'This adds per-block direction and inline isolation. Preserve raw Markdown for persistence and raw-source copy; rendered selection contains visible text, not Markdown syntax.'
    ],
    example: {
      filename: 'message-parser.ts',
      code: `import MarkdownIt from 'markdown-it';
import { markdownItBidi } from '@bidilens/markdown';

export function createMessageParser(inheritedDirection: 'ltr' | 'rtl' = 'ltr') {
  const parser = new MarkdownIt({ html: false });
  markdownItBidi(parser, { inheritedDirection });
  return parser;
}
`
    },
    rollback: 'Recreate the parser without registering markdownItBidi; do not try to unpatch a running parser.'
  },
  ...[
    ['vue', 'Vue component and streaming', 'packages/vue/README.md', 'npm install @bidilens/vue', 'Existing Vue 3.5+ application.'],
    ['svelte', 'Svelte stores and isolation plans', 'packages/svelte/README.md', 'npm install @bidilens/svelte', 'Existing Svelte 4 or 5 application; stores require host rendering.'],
    ['web-component', 'Framework-independent custom element', 'packages/web-component/README.md', 'npm install @bidilens/web-component', 'Browser custom elements; explicit registration or the /auto entry.'],
    ['remark', 'unified / remark / rehype Markdown', 'packages/markdown/README.md', 'npm install @bidilens/markdown', 'Existing unified pipeline; follow the documented remark/rehype ordering and peer installs.'],
    ['android', 'Android Views and Jetpack Compose', 'android/README.md', null, 'Maven Central core, Views, and Compose artifacts. Follow the Android guide for toolchain/API requirements.'],
    ['apple', 'iOS / macOS Swift, UIKit, and SwiftUI', 'apple/README.md', null, 'Source integration, not registry-published; downstream device/accessibility validation remains necessary.'],
    ['windows', 'Windows .NET and WPF', 'windows/README.md', null, 'Source integration, not NuGet-published; downstream UI/accessibility validation remains necessary.'],
    ['rust', 'Native Rust analysis', 'rust/README.md', null, 'Source integration, not crates.io-published; core analysis is not a terminal glyph renderer.']
  ].map(([target, title, path, install, compatibility]) => ({
    target: target!,
    title: title!,
    docs: `${repository}${path}`,
    install: install ?? null,
    compatibility: `${compatibility}${install ? ` ${npmCompatibility}` : ''}`,
    steps: ['Follow the linked platform guide for the complete example, lifecycle, supported versions, and validation checklist.'],
    rollback: 'Keep integration at one rendering boundary. Follow the platform guide to detach/restore adapters; do not rewrite stored text.'
  }))
];

const safeguards = [
  'This guide is offline and read-only: no project scanning, file changes, installs, telemetry, or network requests. npx itself may download the CLI.',
  'Install only the adapter you need. Keep existing compatible framework/parser versions; do not run a framework upgrade just to follow an example.',
  'Use one adapter per rendering boundary. Keep source text unchanged and leave application layout direction under application control.',
  'With default auto intervention, ordinary LTR text in an LTR host receives no BidiLens annotations. Components/serializers still create their normal element, and analysis still has a runtime cost.',
  'Automatic direction is a heuristic, not knowledge of author intent. Use an explicit host policy for ambiguous content.',
  'Pilot one surface behind your own feature flag before a wider rollout.'
];

const checks = [
  'Render: React یک کتابخانه جاوااسکریپت بسیار محبوب است. Expect an RTL block and an isolated LTR React token.',
  'Render: The Persian word کتاب means book. Expect an LTR block with the Persian run isolated.',
  'Compare LTR-only output before/after; no BidiLens annotations in an LTR host. Also test an RTL parent explicitly.',
  'Check punctuation, multiple paragraphs, code/links, and left/center alignment in the actual browser or native app.',
  'Confirm visible selection stays in logical order, and your raw-copy button returns the original source. Test screen readers and editing separately.',
  'Exercise updates, unmount/cleanup, and feature-flag rollback. Measure representative long messages in your app.'
];

export function integrationGuide(target?: string): object {
  const selected = target === undefined ? undefined : guides.find((guide) => guide.target === target);
  if (target !== undefined && !selected) {
    // Do not echo arbitrary terminal control sequences supplied as a target.
    throw new Error(`Unknown guide target. Choose one of: ${guides.map((guide) => guide.target).join(', ')}.`);
  }
  return {
    schemaVersion: 1,
    readOnly: true,
    ...(selected ? { guide: selected } : { targets: guides.map(({ target: id, title }) => ({ target: id, title })) }),
    safeguards,
    checks
  };
}

export function formatIntegrationGuide(target?: string): string {
  // Use the same lookup/validation as JSON output; no environment-dependent recommendations.
  integrationGuide(target);
  const selected = guides.find((guide) => guide.target === target);
  const sections = selected ? [
    `${selected.title}\n${selected.compatibility}`,
    selected.install ? `Install in your existing app:\n${selected.install}` : 'No npm install: use the native platform guide.',
    selected.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    ...(selected.example ? [`${selected.example.filename}:\n\n${selected.example.code.trimEnd()}`] : []),
    `Rollback: ${selected.rollback}`,
    `Full guide: ${selected.docs}`
  ] : [
    'Choose your rendering boundary (you do not need every package):',
    ...guides.map((guide) => `  ${guide.target.padEnd(14)} ${guide.title}`),
    'Next: bidilens guide <target>\nExample: bidilens guide react\nFor tooling: bidilens guide react --json'
  ];
  return [...sections, `Safe adoption:\n${safeguards.map((item) => `- ${item}`).join('\n')}`,
    `Before rollout:\n${checks.map((item) => `- ${item}`).join('\n')}`].join('\n\n');
}
