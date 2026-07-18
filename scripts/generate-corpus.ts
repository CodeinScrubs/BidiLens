import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { findTechnicalTokenRanges } from '../packages/core/src/index.js';

type Direction = 'ltr' | 'rtl' | 'neutral';

interface Fixture {
  id: string;
  description: string;
  text: string;
  words: string[];
  expected: Direction;
  expectedVisualOrderRightToLeft?: number[];
  expectedVisualOrderLeftToRight?: number[];
  expectedIsolations?: Array<{ text: string; direction: 'ltr' | 'rtl' | 'auto'; kind: string }>;
  expectedSecurityCodes?: string[];
  tags: string[];
  curation: 'user-provided' | 'authored-template-matrix';
  nativeSpeakerReviewed: boolean;
}

interface Phrase {
  language: string;
  text: string;
  nativeSpeakerReviewed?: boolean;
}

const rtlPhrases: Phrase[] = [
  { language: 'fa', text: 'این نسخه اکنون برای استفاده آماده است.' },
  { language: 'fa', text: 'برای نصب برنامه این دستور را اجرا کنید.' },
  { language: 'fa', text: 'فایل را باز کنید و تغییرات را ذخیره کنید.' },
  { language: 'fa', text: 'نتیجه آزمایش با موفقیت تأیید شد.' },
  { language: 'fa', text: 'این کتابخانه بسیار محبوب و کاربردی است.' },
  { language: 'fa', text: 'لطفاً پیوند زیر را در مرورگر باز کنید.' },
  { language: 'fa', text: 'پاسخ نهایی پس از بررسی منتشر شد.' },
  { language: 'fa', text: 'کاربر می‌تواند تنظیمات جدید را فعال کند.' },
  { language: 'fa', text: 'سامانه پیام را بدون خطا پردازش کرد.' },
  { language: 'fa', text: 'راهنمای کامل در مستندات پروژه نوشته شده است.' },
  { language: 'ar', text: 'تم نشر الإصدار الجديد بنجاح.' },
  { language: 'ar', text: 'افتح الملف ثم احفظ التغييرات.' },
  { language: 'ar', text: 'هذه المكتبة مفيدة وسهلة الاستخدام.' },
  { language: 'ar', text: 'راجع النتيجة قبل إرسال الرسالة.' },
  { language: 'ar', text: 'يمكن للمستخدم تفعيل الإعداد الجديد.' },
  { language: 'he', text: 'הגרסה החדשה פורסמה בהצלחה.' },
  { language: 'he', text: 'פתחו את הקובץ ושמרו את השינויים.' },
  { language: 'he', text: 'הספרייה הזאת שימושית וקלה להתקנה.' },
  { language: 'he', text: 'בדקו את התוצאה לפני שליחת ההודעה.' },
  { language: 'he', text: 'המשתמש יכול להפעיל את ההגדרה החדשה.' },
  { language: 'ur', text: 'نیا ورژن کامیابی سے جاری ہو گیا ہے۔' },
  { language: 'ur', text: 'فائل کھولیں اور تبدیلیاں محفوظ کریں۔' },
  { language: 'ur', text: 'یہ لائبریری مفید اور استعمال میں آسان ہے۔' },
  { language: 'ps', text: 'نوې نسخه په بریالیتوب خپره شوه.' },
  { language: 'ps', text: 'د بدلونونو له ثبتولو مخکې پایله وګورئ.' },
  { language: 'ckb', text: 'وەشانی نوێ بە سەرکەوتوویی بڵاوکرایەوە.' },
  { language: 'ckb', text: 'فایلەکە بکەرەوە و گۆڕانکارییەکان پاشەکەوت بکە.' },
  { language: 'ckb', text: 'ئەم کتێبخانەیە بەسوود و ئاسانە.' }
];

const englishPhrases = [
  'The release completed successfully.',
  'Open the file and save the changes.',
  'This library is useful and easy to install.',
  'Review the result before sending the message.',
  'The user can enable the new setting.',
  'The application processed the message without errors.',
  'The complete guide is available in the project documentation.',
  'The test suite confirmed the expected result.',
  'The browser preserved the original logical text.',
  'The deployment finished after the final review.'
];

const technicalTokens = [
  { text: 'React', tags: ['identifier', 'product'] },
  { text: 'GPT-5', tags: ['identifier', 'model'] },
  { text: 'Claude', tags: ['identifier', 'model'] },
  { text: 'JavaScript', tags: ['identifier', 'language'] },
  { text: '@bidilens/core', tags: ['package', 'scoped-package'] },
  { text: 'react-markdown', tags: ['package'] },
  { text: 'v2.1.0', tags: ['version'] },
  { text: 'src/index.ts', tags: ['path', 'posix-path'] },
  { text: 'C:\\Users\\dev\\app.ts', tags: ['path', 'windows-path'] },
  { text: '/usr/local/bin/node', tags: ['path', 'posix-path'] },
  { text: 'https://example.com/docs?q=rtl', tags: ['url'] },
  { text: 'support@example.com', tags: ['email'] },
  { text: 'pnpm install', tags: ['command', 'cli'] },
  { text: '$NODE_ENV', tags: ['environment-variable'] },
  { text: 'a1b2c3d4e5f6', tags: ['hash', 'git'] },
  { text: '192.0.2.42', tags: ['ipv4'] },
  { text: '2001:db8::1', tags: ['ipv6'] },
  { text: '+98 21 1234 5678', tags: ['phone'] },
  { text: '2026-07-18', tags: ['date'] },
  { text: '14:30:00', tags: ['time'] }
];

function splitNaturalWords(text: string): string[] {
  return text
    .replace(/([.!?؟،؛。।۔])/gu, ' $1 ')
    .replace(/([,;:])/gu, ' $1 ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function numberedWords(text: string): string[] {
  const words: string[] = [];
  let cursor = 0;
  for (const range of findTechnicalTokenRanges(text)) {
    words.push(...splitNaturalWords(text.slice(cursor, range.start)));
    // URLs, paths, commands, email addresses, versions, and similar spans are
    // one semantic numbered token even when they contain punctuation/spaces.
    words.push(text.slice(range.start, range.end));
    cursor = range.end;
  }
  words.push(...splitNaturalWords(text.slice(cursor)));
  return words;
}

function makeFixture(
  id: string,
  description: string,
  text: string,
  expected: Direction,
  tags: string[],
  extras: Partial<Fixture> = {}
): Fixture {
  const words = numberedWords(text);
  const positions = words.map((_, index) => index + 1);
  return {
    id,
    description,
    text,
    words,
    expected,
    ...(expected === 'rtl' ? { expectedVisualOrderRightToLeft: positions } : {}),
    ...(expected === 'ltr' ? { expectedVisualOrderLeftToRight: positions } : {}),
    tags,
    curation: 'authored-template-matrix',
    nativeSpeakerReviewed: false,
    ...extras
  };
}

const fixtures: Fixture[] = [
  makeFixture(
    'fa-flagship-001',
    'Persian-majority sentence starting with an English identifier must use an RTL base.',
    'React یک کتابخانه جاوااسکریپت بسیار محبوب است.',
    'rtl',
    ['fa', 'flagship', 'leading-latin', 'identifier'],
    {
      curation: 'user-provided',
      nativeSpeakerReviewed: false,
      expectedIsolations: [{ text: 'React', direction: 'ltr', kind: 'identifier' }]
    }
  )
];

for (const [phraseIndex, phrase] of rtlPhrases.entries()) {
  for (const [tokenIndex, token] of technicalTokens.entries()) {
    const placement = (phraseIndex + tokenIndex) % 3;
    const withoutPeriod = phrase.text.replace(/[.۔]$/u, '');
    const text = placement === 0
      ? `${token.text}، ${phrase.text}`
      : placement === 1
        ? `${withoutPeriod}؛ ${token.text} و سپس ادامه دهید.`
        : `${withoutPeriod}: ${token.text}.`;
    fixtures.push(makeFixture(
      `${phrase.language}-technical-${String(phraseIndex + 1).padStart(2, '0')}-${String(tokenIndex + 1).padStart(2, '0')}`,
      `RTL ${phrase.language} prose with a ${token.tags[0]} token in ${['leading', 'middle', 'trailing'][placement]} position.`,
      text,
      'rtl',
      [phrase.language, 'mixed', ...token.tags, `${['leading', 'middle', 'trailing'][placement]}-technical`],
      { nativeSpeakerReviewed: phrase.nativeSpeakerReviewed ?? false }
    ));
  }
}

const rtlTerms = ['کتاب', 'سلام', 'کاربر', 'العربية', 'مرحبا', 'עברית', 'שלום', 'کتابچہ', 'پښتو', 'کوردی'];
for (const [phraseIndex, phrase] of englishPhrases.entries()) {
  for (const [termIndex, term] of rtlTerms.entries()) {
    const placement = (phraseIndex + termIndex) % 3;
    const withoutPeriod = phrase.replace(/\.$/u, '');
    const text = placement === 0
      ? `${term} is the localized term. ${phrase}`
      : placement === 1
        ? `${withoutPeriod}; the localized term is ${term}.`
        : `${withoutPeriod}: “${term}”.`;
    fixtures.push(makeFixture(
      `en-rtl-term-${String(phraseIndex + 1).padStart(2, '0')}-${String(termIndex + 1).padStart(2, '0')}`,
      `English-majority prose with an RTL term in ${['leading', 'middle', 'trailing'][placement]} position.`,
      text,
      'ltr',
      ['en', 'mixed', 'rtl-term', `${['leading', 'middle', 'trailing'][placement]}-rtl`]
    ));
  }
}

const structuredCases = [
  ['markdown-heading-fa', '# راهنمای نصب برنامه', 'rtl', ['markdown', 'heading', 'fa']],
  ['markdown-list-fa', '- مرحله اول\n- مرحله دوم', 'rtl', ['markdown', 'list', 'fa']],
  ['markdown-task-fa', '- [x] آزمایش کامل شد', 'rtl', ['markdown', 'task-list', 'fa']],
  ['markdown-quote-fa', '> نتیجه نهایی تأیید شد', 'rtl', ['markdown', 'blockquote', 'fa']],
  ['markdown-link-fa', 'برای جزئیات [راهنما](https://example.com) را باز کنید.', 'rtl', ['markdown', 'link', 'fa']],
  ['markdown-code-fa', 'دستور `pnpm install` را اجرا کنید.', 'rtl', ['markdown', 'inline-code', 'fa']],
  ['markdown-code-leading-fa', '`pnpm install` را برای نصب برنامه اجرا کنید.', 'rtl', ['markdown', 'inline-code', 'leading-code', 'fa']],
  ['markdown-code-trailing-fa', 'فایل اصلی در `src/index.ts` قرار دارد.', 'rtl', ['markdown', 'inline-code', 'trailing-code', 'fa']],
  ['markdown-code-multiple-fa', 'دستور `pnpm install` را اجرا و سپس `pnpm test` را بررسی کنید.', 'rtl', ['markdown', 'inline-code', 'multiple-code', 'fa']],
  ['markdown-fence-en', '```ts\nconst value = 42;\n```', 'ltr', ['markdown', 'code-fence', 'code']],
  ['markdown-fence-incomplete-fa', '```ts\nconst value = 42;\n\nتوضیح هنوز ادامه دارد', 'rtl', ['markdown', 'incomplete-stream', 'code-fence', 'fa']],
  ['markdown-table-fa', '| نام | مقدار |\n| --- | --- |\n| نسخه | جدید |', 'rtl', ['markdown', 'table', 'fa']],
  ['markdown-nested-list-fa', '- مرحله اول\n  - جزئیات مرحله اول\n  - نتیجه نهایی', 'rtl', ['markdown', 'nested-list', 'fa']],
  ['markdown-footnote-fa', 'این نتیجه تأیید شده است.[^1]\n\n[^1]: گزارش آزمایش کامل است.', 'rtl', ['markdown', 'footnote', 'fa']],
  ['citation-fa', 'طبق گزارش پژوهش [1] نتیجه نهایی تأیید شد.', 'rtl', ['fa', 'citation', 'brackets']],
  ['brackets-fa', '(نسخه جدید) اکنون آماده است.', 'rtl', ['fa', 'brackets']],
  ['quotes-he', 'ההודעה “מוכנה” לפרסום.', 'rtl', ['he', 'quotes']],
  ['digits-persian', 'نسخه ۲٫۱ در تاریخ ۱۴۰۵/۰۴/۲۷ آماده شد.', 'rtl', ['fa', 'persian-digits', 'date']],
  ['digits-arabic', 'الإصدار ٢٫١ جاهز الآن.', 'rtl', ['ar', 'arabic-indic-digits']],
  ['digits-latin-en', 'Version 2.1 is ready on 2026-07-18.', 'ltr', ['en', 'latin-digits', 'date']],
  ['emoji-fa', '✅ عملیات با موفقیت انجام شد.', 'rtl', ['fa', 'emoji']],
  ['combining-he', 'שָׁלוֹם וברוכים הבאים.', 'rtl', ['he', 'combining-marks']],
  ['zwnj-fa', 'می‌توان این گزینه را فعال کرد.', 'rtl', ['fa', 'zwnj']],
  ['zwj-emoji-en', 'The family emoji 👨‍👩‍👧‍👦 remains intact.', 'ltr', ['en', 'zwj', 'emoji']],
  ['math-fa', 'نتیجه معادله x² + y² = z² درست است.', 'rtl', ['fa', 'math']],
  ['html-fragment-en', '<span>سلام</span> appears in the example.', 'ltr', ['en', 'html', 'mixed']],
  ['security-rlo-fa', 'نتیجه نهایی \u202Eتأیید شد.', 'rtl', ['fa', 'directional-control', 'security', 'rlo']],
  ['security-isolate-en', 'The value is \u2067سلام\u2069 in this example.', 'ltr', ['en', 'directional-control', 'security', 'isolate']],
  ['security-zws-en', 'The file name is safe\u200Bname.txt in this example.', 'ltr', ['en', 'zero-width-space', 'security']],
  ['malformed-markdown-fa', '**نتیجه نهایی هنوز آماده است.', 'rtl', ['fa', 'markdown', 'malformed']],
  ['long-fa', `React ${'این سامانه پیام را به‌درستی پردازش می‌کند و '.repeat(100)}پایان.`, 'rtl', ['fa', 'long', 'performance']]
] as const;

const expectedSecurityCodes = new Map<string, string[]>([
  ['combining-he', []],
  ['zwnj-fa', []],
  ['security-rlo-fa', ['BIDI_OVERRIDE_CONTROL', 'BIDI_UNCLOSED_EMBEDDING']],
  ['security-isolate-en', ['BIDI_ISOLATE_CONTROL', 'BIDI_POP_CONTROL']],
  ['security-zws-en', ['HIDDEN_ZERO_WIDTH_SPACE']]
]);

for (const [id, text, expected, tags] of structuredCases) {
  const securityCodes = expectedSecurityCodes.get(id);
  fixtures.push(makeFixture(
    id,
    `Curated ${tags.join(', ')} regression case.`,
    text,
    expected,
    [...tags],
    securityCodes === undefined ? {} : { expectedSecurityCodes: securityCodes }
  ));
}

for (const [index, token] of technicalTokens.entries()) {
  fixtures.push(makeFixture(
    `neutral-technical-${String(index + 1).padStart(2, '0')}`,
    `A standalone ${token.tags[0]} token contains no natural-language direction evidence.`,
    token.text,
    'neutral',
    ['neutral', 'technical-only', ...token.tags]
  ));
}

for (const [index, text] of ['...', '—', '()[]{}', '✅🚀', '123456', '۱۲۳۴۵۶', '٢٣٤٥٦', '14:30', '2026-07-18', '+1 (555) 010-0200'].entries()) {
  fixtures.push(makeFixture(
    `neutral-symbols-${String(index + 1).padStart(2, '0')}`,
    'Neutral-only punctuation, symbols, emoji, or numeric content.',
    text,
    'neutral',
    ['neutral', 'symbols-or-numbers']
  ));
}

const ids = new Set(fixtures.map((fixture) => fixture.id));
if (ids.size !== fixtures.length) throw new Error('Corpus generator produced duplicate fixture IDs.');
if (fixtures.length < 300) throw new Error(`Corpus generator produced only ${fixtures.length} fixtures.`);

const serialized = `${JSON.stringify(fixtures, null, 2)}\n`;
const rootCorpus = resolve('corpus', 'cases.json');
const cliCorpus = resolve('packages', 'cli', 'corpus', 'cases.json');
await mkdir(resolve('packages', 'cli', 'corpus'), { recursive: true });
await writeFile(rootCorpus, serialized, 'utf8');
await writeFile(cliCorpus, serialized, 'utf8');
console.log(`Generated ${fixtures.length} deterministic corpus fixtures in both release locations.`);
