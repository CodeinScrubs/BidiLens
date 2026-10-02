import type { DetectionOptions, ResolvedDirection } from '../../packages/core/src/types.js';

/**
 * Curated logical reconstructions inspired by five user-supplied captures on
 * 2026-10-02. These are NOT recovered ChatGPT source or clinical guidance.
 */
export interface MobileStudyCase {
  id: string;
  source: string;
  direction: ResolvedDirection;
  firstToken?: string;
  isolations?: readonly string[];
  options?: DetectionOptions;
}

export const MOBILE_STUDY_CASES: readonly MobileStudyCase[] = [
  {
    id: 'capsule',
    source: 'Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.',
    direction: 'rtl', firstToken: 'Capsule', isolations: ['Capsule']
  },
  {
    id: 'macrophage',
    source: 'Macrophage برای بلعیدن باکتری خیلی بهتر عمل می‌کند وقتی با opsonin پوشانده شده باشد.',
    direction: 'rtl', firstToken: 'Macrophage', isolations: ['Macrophage', 'opsonin']
  },
  {
    id: 'splenectomy',
    source: 'splenectomy یعنی کل گیت را جمع کرده‌ای.',
    direction: 'rtl', firstToken: 'splenectomy', isolations: ['splenectomy']
  },
  {
    id: 'spleen-question',
    source: 'spleen دقیقاً چه کار می‌کند؟',
    direction: 'rtl', firstToken: 'spleen', isolations: ['spleen']
  },
  {
    id: 'pyruvate-phrase',
    source: 'Pyruvate kinase یکی از enzymeهایی است که در RBC اهمیت دارد چون RBC تقریباً mitochondria ندارد و برای ATP وابسته به glycolysis است.',
    direction: 'rtl', firstToken: 'Pyruvate kinase',
    isolations: ['Pyruvate kinase', 'enzyme', 'RBC', 'mitochondria', 'ATP', 'glycolysis']
  },
  {
    id: 'persian-intent',
    source: 'Retrieval: چرا polysaccharide capsule باعث می‌شود IgM + complement در دفاع مهم‌تر شوند؟',
    // The default character majority is LTR. Known author intent is supplied
    // explicitly; neither a screenshot nor a domain dictionary can infer it.
    direction: 'rtl', firstToken: 'Retrieval', options: { strategy: 'rtl' },
    isolations: ['Retrieval', 'polysaccharide capsule', 'IgM + complement']
  },
  {
    id: 'english-mirror',
    source: 'The Persian word طحال means spleen in English.',
    direction: 'ltr', firstToken: 'The', isolations: ['طحال']
  },
  { id: 'igg-formula', source: 'IgG / IgM + C3b → phagocytosis ↑', direction: 'ltr', firstToken: 'IgG' },
  { id: 'pyruvate-formula', source: 'PEP + ADP → Pyruvate + ATP', direction: 'ltr', firstToken: 'PEP' }
];

function studySource(id: string): string {
  const item = MOBILE_STUDY_CASES.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown curated study case: ${id}`);
  return item.source;
}

export const MOBILE_MEDICAL_MARKDOWN = [
  '## spleen دقیقاً چه کار می‌کند؟', '',
  studySource('capsule'), '', studySource('macrophage'), '',
  studySource('igg-formula'), '', studySource('pyruvate-phrase'), '',
  studySource('pyruvate-formula'), '',
  '- Splenic macrophages در خون باکتری‌ها را می‌گیرند.',
  '- The Persian word طحال means spleen.', '',
  '> برای خواندن، ترتیب متن اصلی را حفظ کنید.'
].join('\n');

export const QUERY_LITERALS = Object.freeze([String.raw`\bTB\b`, '%TB%', '[[:<:]]TB[[:>:]]']);
export const MOBILE_QUERY_MARKDOWN = [
  '## Search این الگوها را دقیق وارد کنید.', '',
  `برای جستجوی واژه، \`${QUERY_LITERALS[0]}\` را وارد کنید.`, '',
  `الگوی دیگر \`${QUERY_LITERALS[1]}\` است.`, '',
  `این نمونهٔ نحوی \`${QUERY_LITERALS[2]}\` را نیز بدون تغییر نگه دارید.`, '',
  '> نتیجه‌ها را مقایسه کنید؛ جهت نمایش نباید رشتهٔ جستجو را تغییر دهد.', '',
  '```text', ...QUERY_LITERALS, '```'
].join('\n');
