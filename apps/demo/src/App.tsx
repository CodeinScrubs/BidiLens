import { useEffect, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import {
  analyzeBlock,
  scanBidiSecurity,
  visibleBidiControls,
  type BidiSecurityMode,
  type DetectionStrategy
} from '@bidilens/core';
import { markdownItBidi, rehypeBidi, remarkBidi } from '@bidilens/markdown';
import { BidiCode, BidiIsolate, BidiMessage, StreamingBidiMessage } from '@bidilens/react';
import corpusUrl from '../../../corpus/cases.json?url';

type UiLanguage = 'en' | 'fa';
type Theme = 'light' | 'dark';
type PlaygroundPolicy = Extract<DetectionStrategy, 'content-majority' | 'first-strong'>;

interface CorpusFixture {
  id: string;
  description: string;
  text: string;
  expected: 'ltr' | 'rtl' | 'neutral';
  tags: string[];
  nativeSpeakerReviewed: boolean;
}

const FLAGSHIP = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';

const SAMPLE = `# پاسخ ترکیبی

${FLAGSHIP}

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

const PRESETS = [
  { id: 'flagship', en: 'Persian-majority, English first', fa: 'فارسی غالب، شروع انگلیسی', text: FLAGSHIP },
  { id: 'english', en: 'English-majority with Persian', fa: 'انگلیسی غالب با واژهٔ فارسی', text: 'The Persian word کتاب means “book” in this sentence.' },
  { id: 'persian-url', en: 'Persian with URL and path', fa: 'فارسی با نشانی و مسیر فایل', text: 'مستندات https://example.com/docs را ببینید و فایل src/index.ts را باز کنید.' },
  { id: 'arabic', en: 'Arabic with English identifiers', fa: 'عربی با شناسه‌های انگلیسی', text: 'تستخدم المنصة React و Node.js لبناء الواجهة الجديدة.' },
  { id: 'hebrew', en: 'Hebrew with a package name', fa: 'عبری با نام بسته', text: 'התקינו את החבילה @bidilens/core לפני הפעלת היישום.' },
  { id: 'urdu', en: 'Urdu with an English command', fa: 'اردو با دستور انگلیسی', text: 'پروجیکٹ شروع کرنے کے لیے `pnpm install` چلائیں۔' },
  { id: 'markdown', en: 'Structured mixed Markdown', fa: 'Markdown ساخت‌یافته و ترکیبی', text: SAMPLE },
  { id: 'security', en: 'Visible bidi-control audit', fa: 'ممیزی نویسهٔ کنترل پنهان', text: `safe ${String.fromCodePoint(0x202e)}hidden${String.fromCodePoint(0x202c)} text` }
] as const;

const COPY = {
  en: {
    product: 'BidiLens v0.1.0',
    headline: 'Mixed-direction text that stays readable while AI streams.',
    intro: 'Standards-based direction detection, Markdown annotation, inline isolation, and hidden-control auditing.',
    direction: 'Direction', confidence: 'Confidence', counts: 'RTL / LTR', controls: 'Hidden controls',
    input: 'Input Markdown', inputHelp: 'Edit Persian, Arabic, Hebrew, English, code, URLs, and tables.',
    preset: 'Load a mixed-direction preset', presetPlaceholder: 'Load a preset…',
    policy: 'Direction policy', securityMode: 'Security mode',
    contentMajority: 'Content majority', firstStrong: 'First strong',
    preview: 'Rendered Markdown', previewHelp: 'Each semantic block receives its own base direction.',
    stream: 'Streaming message', streamHelp: 'Adjust deterministic source chunks and delay.',
    streamStart: 'Simulate stream', streaming: 'Streaming…', chunk: 'Chunk size', speed: 'Delay (ms)',
    inspectors: 'AST, direction, isolation, and security', inspectorsHelp: 'Auditable source ranges; no hidden text mutation.',
    evidence: 'Direction evidence', noEvidence: 'No strong natural-language evidence.',
    isolations: 'Isolation plan', noIsolations: 'No inline isolation is required.',
    security: 'Security findings', safe: 'No hidden bidi security findings.', ast: 'Markdown AST',
    share: 'Copy share link', exportJson: 'Export JSON', exportHtml: 'Export semantic HTML', verifyCopy: 'Verify logical copy',
    comparison: 'Live four-way comparison', comparisonHelp: 'The current immutable input under four base-direction approaches.',
    browser: 'Browser default', naive: 'Naive global RTL', auto: 'dir=auto', toolkit: 'BidiLens content-majority',
    corpus: 'Offline corpus browser', corpusHelp: 'Search all 918 bundled cases and load one into the playground.',
    corpusSearch: 'Search fixture ID, description, tag, or text', load: 'Load', reviewed: 'native reviewed',
    primitives: 'Isolation primitives', primitivesHelp: 'Identifiers remain readable inside RTL prose.',
    language: 'فارسی', theme: 'Dark theme',
    shareCopied: 'Share link copied.', shareFallback: 'Share state added to the address bar; copy the URL manually.',
    jsonExported: 'Analysis JSON exported.', htmlExported: 'Semantic HTML exported.',
    copyPassed: 'Logical selection and clipboard text match the immutable source.',
    copySelectionPassed: 'Logical selection matches the immutable source; clipboard readback is unavailable.',
    copyFailed: 'Logical copy verification failed.'
  },
  fa: {
    product: 'BidiLens نسخهٔ ۰٫۱٫۰',
    headline: 'متن دوجهته‌ای که هنگام پخش پاسخ هوش مصنوعی خوانا می‌ماند.',
    intro: 'تشخیص جهت بر پایهٔ استاندارد، نشانه‌گذاری Markdown، ایزوله‌سازی درون‌خطی و ممیزی نویسه‌های پنهان.',
    direction: 'جهت', confidence: 'اطمینان', counts: 'RTL / LTR', controls: 'نویسهٔ پنهان',
    input: 'ورودی Markdown', inputHelp: 'فارسی، عربی، عبری، انگلیسی، کد، نشانی و جدول را ویرایش کنید.',
    preset: 'بارگذاری نمونهٔ دوجهته', presetPlaceholder: 'انتخاب نمونه…',
    policy: 'سیاست تشخیص جهت', securityMode: 'حالت امنیتی',
    contentMajority: 'محتوای غالب', firstStrong: 'نخستین نویسهٔ قوی',
    preview: 'Markdown رندرشده', previewHelp: 'جهت پایهٔ هر بلوک معنایی جداگانه تعیین می‌شود.',
    stream: 'پیام در حال پخش', streamHelp: 'اندازهٔ قطعه و تأخیر قطعی را تنظیم کنید.',
    streamStart: 'شبیه‌سازی پخش', streaming: 'در حال پخش…', chunk: 'اندازهٔ قطعه', speed: 'تأخیر (میلی‌ثانیه)',
    inspectors: 'درخت AST، جهت، ایزوله‌سازی و امنیت', inspectorsHelp: 'بازه‌های قابل‌ممیزی بدون تغییر متن منبع.',
    evidence: 'شواهد جهت', noEvidence: 'شاهد قوی زبان طبیعی وجود ندارد.',
    isolations: 'برنامهٔ ایزوله‌سازی', noIsolations: 'ایزوله‌سازی درون‌خطی لازم نیست.',
    security: 'یافته‌های امنیتی', safe: 'نویسهٔ کنترل پنهانی یافت نشد.', ast: 'درخت Markdown',
    share: 'کپی پیوند اشتراک', exportJson: 'خروجی JSON', exportHtml: 'خروجی HTML معنایی', verifyCopy: 'بررسی کپی منطقی',
    comparison: 'مقایسهٔ زندهٔ چهارتایی', comparisonHelp: 'ورودی تغییرناپذیر فعلی با چهار روش تعیین جهت پایه.',
    browser: 'پیش‌فرض مرورگر', naive: 'RTL سراسری ساده‌لوحانه', auto: 'dir=auto', toolkit: 'BidiLens با محتوای غالب',
    corpus: 'مرورگر آفلاین پیکره', corpusHelp: 'در هر ۹۱۸ نمونه جست‌وجو کنید و یکی را در محیط بارگذاری کنید.',
    corpusSearch: 'جست‌وجوی شناسه، توضیح، برچسب یا متن', load: 'بارگذاری', reviewed: 'بازبینی بومی',
    primitives: 'اجزای ایزوله‌سازی', primitivesHelp: 'شناسه‌ها در متن RTL خوانا می‌مانند.',
    language: 'English', theme: 'پوستهٔ تیره',
    shareCopied: 'پیوند اشتراک کپی شد.', shareFallback: 'وضعیت در نشانی قرار گرفت؛ نشانی را دستی کپی کنید.',
    jsonExported: 'فایل JSON تحلیل ذخیره شد.', htmlExported: 'فایل HTML معنایی ذخیره شد.',
    copyPassed: 'انتخاب منطقی و متن کلیپ‌بورد با منبع تغییرناپذیر برابر است.',
    copySelectionPassed: 'انتخاب منطقی با منبع برابر است؛ خواندن کلیپ‌بورد در دسترس نیست.',
    copyFailed: 'بررسی کپی منطقی ناموفق بود.'
  }
} as const;

function initialMarkdown(): string {
  if (typeof window === 'undefined' || !window.location.hash) return SAMPLE;
  try {
    const shared = new URLSearchParams(window.location.hash.slice(1)).get('text');
    return shared ?? SAMPLE;
  } catch {
    return SAMPLE;
  }
}

function downloadText(filename: string, text: string, type: string): void {
  const objectUrl = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function App() {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [streamed, setStreamed] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [chunkSize, setChunkSize] = useState(1);
  const [streamDelay, setStreamDelay] = useState(12);
  const [policy, setPolicy] = useState<PlaygroundPolicy>('content-majority');
  const [securityMode, setSecurityMode] = useState<BidiSecurityMode>('audit');
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [corpusQuery, setCorpusQuery] = useState('');
  const [corpus, setCorpus] = useState<CorpusFixture[]>([]);
  const [actionStatus, setActionStatus] = useState('');
  const t = COPY[uiLanguage];
  const analysis = useMemo(() => analyzeBlock(markdown, {
    fallback: 'neutral',
    strategy: policy
  }), [markdown, policy]);
  const security = useMemo(() => scanBidiSecurity(markdown, { mode: securityMode }), [markdown, securityMode]);
  const ast = useMemo(() => unified().use(remarkParse).use(remarkGfm).parse(markdown), [markdown]);
  const filteredCorpus = useMemo(() => {
    const query = corpusQuery.trim().toLocaleLowerCase();
    if (!query) return corpus.slice(0, 24);
    return corpus.filter((fixture) => [
      fixture.id, fixture.description, fixture.text, fixture.tags.join(' ')
    ].some((value) => value.toLocaleLowerCase().includes(query))).slice(0, 24);
  }, [corpus, corpusQuery]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(corpusUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Corpus request failed with ${response.status}.`);
        return response.json() as Promise<CorpusFixture[]>;
      })
      .then((fixtures) => setCorpus(fixtures))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setActionStatus(error instanceof Error ? error.message : String(error));
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!streaming) return;
    setStreamed('');
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(markdown.length, index + chunkSize);
      setStreamed(markdown.slice(0, index));
      if (index >= markdown.length) {
        window.clearInterval(timer);
        setStreaming(false);
      }
    }, streamDelay);
    return () => window.clearInterval(timer);
  }, [streaming, markdown, chunkSize, streamDelay]);

  async function copyShareLink(): Promise<void> {
    const target = new URL(window.location.href);
    target.hash = new URLSearchParams({ text: markdown }).toString();
    window.history.replaceState(null, '', target);
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(target.href);
        setActionStatus(t.shareCopied);
        return;
      } catch {
        // The URL remains shareable when the browser denies clipboard access.
      }
    }
    setActionStatus(t.shareFallback);
  }

  function exportAnalysis(): void {
    downloadText('bidilens-analysis.json', JSON.stringify({
      source: markdown,
      policy,
      securityMode,
      analysis,
      security,
      ast
    }, null, 2), 'application/json');
    setActionStatus(t.jsonExported);
  }

  async function exportSemanticHtml(): Promise<void> {
    const { default: MarkdownIt } = await import('markdown-it');
    const renderer = new MarkdownIt({ html: false, linkify: true });
    markdownItBidi(renderer, { strategy: policy });
    const html = `<!doctype html>\n<meta charset="utf-8">\n${renderer.render(markdown)}`;
    downloadText('bidilens-semantic.html', html, 'text/html;charset=utf-8');
    setActionStatus(t.htmlExported);
  }

  async function verifyLogicalCopy(): Promise<void> {
    const target = document.querySelector<HTMLElement>('[data-case="toolkit-live"]');
    if (!target || target.textContent !== markdown) {
      setActionStatus(t.copyFailed);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (selection?.toString() !== markdown) {
      setActionStatus(t.copyFailed);
      return;
    }
    if (navigator.clipboard?.writeText && navigator.clipboard?.readText) {
      try {
        await navigator.clipboard.writeText(markdown);
        const copied = await navigator.clipboard.readText();
        setActionStatus(copied === markdown ? t.copyPassed : t.copyFailed);
        return;
      } catch {
        // Selection remains an independently useful logical-order check.
      }
    }
    setActionStatus(t.copySelectionPassed);
  }

  return (
    <main className="shell" lang={uiLanguage} dir={uiLanguage === 'fa' ? 'rtl' : 'ltr'}>
      <header className="hero">
        <div>
          <p className="eyebrow">{t.product}</p>
          <h1>{t.headline}</h1>
          <p>{t.intro}</p>
          <div className="hero-actions">
            <button className="secondary" onClick={() => setUiLanguage(uiLanguage === 'en' ? 'fa' : 'en')}>{t.language}</button>
            <label className="toggle"><input type="checkbox" checked={theme === 'dark'} onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')} /> {t.theme}</label>
          </div>
        </div>
        <div className="metrics">
          <Metric label={t.direction} value={analysis.direction} />
          <Metric label={t.confidence} value={`${Math.round(analysis.confidence * 100)}%`} />
          <Metric label={t.counts} value={`${analysis.counts.rtl} / ${analysis.counts.ltr}`} />
          <Metric label={t.controls} value={String(security.controls.length)} />
        </div>
      </header>

      <section className="grid">
        <article className="panel editor-panel">
          <div className="panel-title stacked-title">
            <div><span>{t.input}</span><small>{t.inputHelp}</small></div>
            <div className="editor-actions">
              <select aria-label={t.preset} defaultValue="" onChange={(event) => {
                const preset = PRESETS.find((item) => item.id === event.target.value);
                if (preset) setMarkdown(preset.text);
                event.target.value = '';
              }}>
                <option value="">{t.presetPlaceholder}</option>
                {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset[uiLanguage]}</option>)}
              </select>
              <label>{t.policy}<select aria-label={t.policy} value={policy} onChange={(event) => setPolicy(event.target.value as PlaygroundPolicy)}>
                <option value="content-majority">{t.contentMajority}</option>
                <option value="first-strong">{t.firstStrong}</option>
              </select></label>
              <label>{t.securityMode}<select aria-label={t.securityMode} value={securityMode} onChange={(event) => setSecurityMode(event.target.value as BidiSecurityMode)}>
                {(['off', 'audit', 'warn', 'strict'] as const).map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select></label>
            </div>
          </div>
          <textarea aria-label={t.input} value={markdown} onChange={(event) => setMarkdown(event.target.value)} dir={analysis.direction === 'neutral' ? 'ltr' : analysis.direction} />
        </article>

        <article className="panel preview-panel">
          <div className="panel-title"><div><span>{t.preview}</span><small>{t.previewHelp}</small></div></div>
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBidi]} rehypePlugins={[rehypeBidi]}>{markdown}</ReactMarkdown>
          </div>
        </article>
      </section>

      <section className="panel stream-panel">
        <div className="panel-title stacked-title">
          <div><span>{t.stream}</span><small>{t.streamHelp}</small></div>
          <div className="editor-actions range-actions">
            <label>{t.chunk}: <output>{chunkSize}</output><input aria-label={t.chunk} type="range" min="1" max="32" value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))} /></label>
            <label>{t.speed}: <output>{streamDelay}</output><input aria-label={t.speed} type="range" min="1" max="100" value={streamDelay} onChange={(event) => setStreamDelay(Number(event.target.value))} /></label>
            <button onClick={() => setStreaming(true)} disabled={streaming}>{streaming ? t.streaming : t.streamStart}</button>
          </div>
        </div>
        <StreamingBidiMessage className="stream-output" text={streamed || '...'} streamOptions={{ strategy: policy, fallback: 'ltr' }} />
      </section>

      <section className="panel analysis-panel">
        <div className="panel-title stacked-title">
          <div><span>{t.inspectors}</span><small>{t.inspectorsHelp}</small></div>
          <div className="editor-actions">
            <button className="secondary" onClick={() => void copyShareLink()}>{t.share}</button>
            <button className="secondary" onClick={() => void verifyLogicalCopy()}>{t.verifyCopy}</button>
            <button className="secondary" onClick={() => void exportSemanticHtml()}>{t.exportHtml}</button>
            <button className="secondary" onClick={exportAnalysis}>{t.exportJson}</button>
          </div>
        </div>
        <div className="inspector-grid three-columns">
          <div><h2>{t.evidence}</h2>{analysis.evidence.length ? <ul className="evidence-list">{analysis.evidence.map((item, index) => <li key={`${item.sourceRange.utf16.start}-${index}`}><code dir={item.direction}>{item.text}</code><span>{item.direction.toUpperCase()} · {item.reason}{item.excluded ? ' · excluded' : ''}</span><small>UTF-16 {item.sourceRange.utf16.start}–{item.sourceRange.utf16.end}</small></li>)}</ul> : <p className="muted">{t.noEvidence}</p>}</div>
          <div><h2>{t.isolations}</h2>{analysis.isolations.length ? <ul className="evidence-list isolation-list">{analysis.isolations.map((item, index) => <li key={`${item.start}-${index}`}><code dir={item.direction}>{item.text}</code><span>{item.direction.toUpperCase()} · {item.kind}</span><small>UTF-16 {item.start}–{item.end}</small></li>)}</ul> : <p className="muted">{t.noIsolations}</p>}</div>
          <div><h2>{t.security}</h2>{security.findings.length ? <ul className="finding-list">{security.findings.map((finding, index) => <li key={`${finding.code}-${finding.sourceRange.utf16.start}-${index}`}><strong>{finding.code}</strong><span>{finding.message}</span></li>)}</ul> : <p className="safe">{t.safe}</p>}</div>
        </div>
        <details className="ast-inspector"><summary>{t.ast}</summary><pre>{JSON.stringify(ast, null, 2)}</pre></details>
        <p className="action-status" aria-live="polite">{actionStatus}</p>
      </section>

      <section className="panel comparison-panel">
        <div className="panel-title"><div><span>{t.comparison}</span><small>{t.comparisonHelp}</small></div></div>
        <div className="comparison-grid">
          <Comparison label={t.browser}><p>{markdown}</p></Comparison>
          <Comparison label={t.naive}><p dir="rtl">{markdown}</p></Comparison>
          <Comparison label={t.auto}><p dir="auto">{markdown}</p></Comparison>
          <Comparison label={t.toolkit}><BidiMessage as="p" data-case="toolkit-live" text={markdown} strategy={policy} /></Comparison>
        </div>
      </section>

      <section className="panel corpus-panel">
        <div className="panel-title"><div><span>{t.corpus}</span><small>{t.corpusHelp}</small></div><input className="corpus-search" aria-label={t.corpusSearch} placeholder={t.corpusSearch} value={corpusQuery} onChange={(event) => setCorpusQuery(event.target.value)} /></div>
        <div className="corpus-results">{filteredCorpus.map((fixture) => <article key={fixture.id} className="corpus-case"><div><strong>{fixture.id}</strong><span className={`direction-badge ${fixture.expected}`}>{fixture.expected}</span></div><p dir="auto">{fixture.text}</p><small>{fixture.description} · {fixture.tags.join(', ')}{fixture.nativeSpeakerReviewed ? ` · ${t.reviewed}` : ''}</small><button className="secondary" onClick={() => setMarkdown(fixture.text)}>{t.load}</button></article>)}</div>
      </section>

      <section className="panel examples">
        <div className="panel-title"><div><span>{t.primitives}</span><small>{t.primitivesHelp}</small></div></div>
        <p dir="rtl" className="sample-line">فایل <BidiCode>src/server/index.ts</BidiCode> را باز کن و نسخه <BidiIsolate direction="ltr">v2.1.0-beta.3</BidiIsolate> را نصب کن.</p>
        {security.controls.length > 0 && <pre className="control-warning">{visibleBidiControls(markdown)}</pre>}
      </section>
    </main>
  );
}

function Comparison({ label, children }: { label: string; children: ReactNode }) {
  return <div className="comparison-case"><strong>{label}</strong>{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
