import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeText, findBidiControls, visibleBidiControls } from '@bidilens/core';
import { rehypeBidi, remarkBidi } from '@bidilens/markdown';
import { BidiCode, BidiIsolate, StreamingBidiMessage } from '@bidilens/react';

const SAMPLE = `# پاسخ ترکیبی

این پروژه مشکل mixed RTL/LTR را در چت‌های هوش مصنوعی حل می‌کند.

- فایل \`src/index.ts\` را باز کن.
- سپس تابع \`renderMessage()\` را اجرا کن.
- Documentation: https://example.com/docs/bidi

| وضعیت | Package | توضیح |
|---|---|---|
| آماده | @bidilens/core | تشخیص جهت و streaming |
| آماده | @bidilens/markdown | remark + rehype |

\`\`\`ts
const message = "سلام from the API";
console.log(message);
\`\`\`
`;

export function App() {
  const [markdown, setMarkdown] = useState(SAMPLE);
  const [streamed, setStreamed] = useState('');
  const [streaming, setStreaming] = useState(false);
  const analysis = useMemo(() => analyzeText(markdown, { fallback: 'neutral' }), [markdown]);
  const controls = useMemo(() => findBidiControls(markdown), [markdown]);

  useEffect(() => {
    if (!streaming) return;
    setStreamed('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setStreamed(markdown.slice(0, index));
      if (index >= markdown.length) {
        window.clearInterval(timer);
        setStreaming(false);
      }
    }, 12);
    return () => window.clearInterval(timer);
  }, [streaming, markdown]);

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">BidiLens v0.1.0</p>
          <h1>Mixed-direction text that stays readable while AI streams.</h1>
          <p>
            Standards-based direction detection, Markdown annotation, inline isolation,
            and hidden-control auditing.
          </p>
        </div>
        <div className="metrics">
          <Metric label="Direction" value={analysis.direction} />
          <Metric label="Confidence" value={`${Math.round(analysis.confidence * 100)}%`} />
          <Metric label="RTL / LTR" value={`${analysis.counts.rtl} / ${analysis.counts.ltr}`} />
          <Metric label="Hidden controls" value={String(controls.length)} />
        </div>
      </header>

      <section className="grid">
        <article className="panel editor-panel">
          <div className="panel-title">
            <div>
              <span>Input Markdown</span>
              <small>Edit Persian, Arabic, Hebrew, English, code, URLs, and tables.</small>
            </div>
            <button onClick={() => setStreaming(true)} disabled={streaming}>
              {streaming ? 'Streaming…' : 'Simulate stream'}
            </button>
          </div>
          <textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} dir="auto" />
        </article>

        <article className="panel preview-panel">
          <div className="panel-title">
            <div>
              <span>Rendered Markdown</span>
              <small>Each semantic block receives its own base direction.</small>
            </div>
          </div>
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBidi]} rehypePlugins={[rehypeBidi]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </article>
      </section>

      <section className="panel stream-panel">
        <div className="panel-title">
          <div>
            <span>Streaming message</span>
            <small>First-strong locks direction and prevents layout flicker.</small>
          </div>
        </div>
        <StreamingBidiMessage
          className="stream-output"
          text={streamed || '...'}
          streamOptions={{ strategy: 'first-strong', fallback: 'ltr' }}
        />
      </section>

      <section className="panel examples">
        <div className="panel-title">
          <div>
            <span>Isolation primitives</span>
            <small>Identifiers remain readable inside RTL prose.</small>
          </div>
        </div>
        <p dir="rtl" className="sample-line">
          فایل <BidiCode>src/server/index.ts</BidiCode> را باز کن و نسخه{' '}
          <BidiIsolate direction="ltr">v2.1.0-beta.3</BidiIsolate> را نصب کن.
        </p>
        {controls.length > 0 && (
          <pre className="control-warning">{visibleBidiControls(markdown)}</pre>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
