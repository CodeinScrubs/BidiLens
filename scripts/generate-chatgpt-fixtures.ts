import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import { findTechnicalTokenRanges } from '../packages/core/src/index.js';

interface RawFixture {
  id: string;
  description: string;
  text: string;
  expected: 'ltr' | 'rtl' | 'neutral';
  expectedIsolations?: Array<{ text: string; direction: 'ltr' | 'rtl' | 'auto'; kind: string }>;
  tags: string[];
}

function splitNaturalWords(text: string): string[] {
  return text
    .replace(/([.!?؟،؛。।۔])/gu, ' $1 ')
    .replace(/([,;:«»"'])/gu, ' $1 ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function numberedWords(text: string): string[] {
  const words: string[] = [];
  let cursor = 0;
  for (const range of findTechnicalTokenRanges(text)) {
    words.push(...splitNaturalWords(text.slice(cursor, range.start)));
    words.push(text.slice(range.start, range.end));
    cursor = range.end;
  }
  words.push(...splitNaturalWords(text.slice(cursor)));
  return words;
}

const rawCases: RawFixture[] = [
  {
    id: 'fa-chatgpt-capsule-001',
    description: 'Persian paragraph starting with an English medical term (Capsule) must resolve to RTL base with the Latin word isolated LTR.',
    text: 'Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'Capsule', direction: 'ltr', kind: 'opposite-direction-run' }
    ],
    tags: ['fa', 'chatgpt', 'medical', 'leading-latin', 'real-world']
  },
  {
    id: 'fa-chatgpt-macrophage-002',
    description: 'Persian paragraph starting with English cell name (Macrophage) and containing opsonin.',
    text: 'Macrophage برای بلعیدن باکتری خیلی بهتر عمل میکند وقتی باکتری با opsonin پوشانده شده باشد، مخصوصاً:',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'Macrophage', direction: 'ltr', kind: 'opposite-direction-run' },
      { text: 'opsonin', direction: 'ltr', kind: 'opposite-direction-run' }
    ],
    tags: ['fa', 'chatgpt', 'medical', 'leading-latin', 'real-world']
  },
  {
    id: 'fa-chatgpt-pyruvate-kinase-003',
    description: 'Persian paragraph starting with multi-word English enzyme name (Pyruvate kinase) and embedded medical acronyms.',
    text: 'Pyruvate kinase یکی از آن enzymeهایی است که برای RBC حیاتی است چون RBC mitochondria ندارد و تقریباً برای ATP به glycolysis وابسته است.',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'Pyruvate kinase', direction: 'ltr', kind: 'opposite-direction-run' },
      { text: 'RBC', direction: 'ltr', kind: 'identifier' },
      { text: 'ATP', direction: 'ltr', kind: 'identifier' }
    ],
    tags: ['fa', 'chatgpt', 'medical', 'leading-latin', 'enzyme', 'real-world']
  },
  {
    id: 'fa-chatgpt-splenic-macrophages-004',
    description: 'Numbered Persian list item starting with English anatomical phrase and loanword suffixes.',
    text: '1) Splenic macrophages خون از spleen عبور میکند و macrophageها باکتریهای opsonized را میگیرند.',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'list-item', 'loanword-suffix', 'real-world']
  },
  {
    id: 'fa-chatgpt-spherocyte-005',
    description: 'Short Persian sentence starting with English clinical finding (spherocyte) and negative verb.',
    text: 'spherocyte واضح ندارد',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'spherocyte', direction: 'ltr', kind: 'opposite-direction-run' }
    ],
    tags: ['fa', 'chatgpt', 'medical', 'leading-latin', 'real-world']
  },
  {
    id: 'fa-chatgpt-target-cell-006',
    description: 'Persian sentence starting with hyphenated English morphological description (target-cell pattern).',
    text: 'target-cell pattern تیپیک thalassemia ندارد',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'leading-latin', 'hyphenated', 'real-world']
  },
  {
    id: 'fa-chatgpt-reticulocyte-007',
    description: 'Persian sentence starting with Latin cell term with Persian plural suffix (Reticulocyteها).',
    text: 'Reticulocyteها enzyme activity بیشتری نسبت به RBC پیر دارند.',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'RBC', direction: 'ltr', kind: 'identifier' }
    ],
    tags: ['fa', 'chatgpt', 'medical', 'loanword-suffix', 'real-world']
  },
  {
    id: 'fa-chatgpt-species-arrow-008',
    description: 'English binomial abbreviation followed by leftwards arrow pointing to Persian importance indicator.',
    text: 'S. pneumoniae ← مهمترین',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'arrow', 'species-name', 'real-world']
  },
  {
    id: 'fa-chatgpt-equation-atp-009',
    description: 'Biochemical reaction equation with plus and arrow operators.',
    text: 'PEP + ADP → Pyruvate + ATP',
    expected: 'ltr',
    tags: ['fa', 'chatgpt', 'medical', 'biochemical-equation', 'arrow', 'real-world']
  },
  {
    id: 'fa-chatgpt-immunology-arrow-010',
    description: 'Immunological complex equation with plus, arrow, and upward trend symbol.',
    text: 'IgG / IgM + C3b → phagocytosis ↑',
    expected: 'ltr',
    tags: ['fa', 'chatgpt', 'medical', 'formula', 'arrow', 'symbols', 'real-world']
  },
  {
    id: 'fa-chatgpt-bacteremia-chain-011',
    description: 'Medical pathophysiology chain with Persian prose and English clinical outcome.',
    text: 'bacteremia میتواند خیلی سریع بالا برود → sepsis / meningitis / OPSI',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'pathway-arrow', 'real-world']
  },
  {
    id: 'fa-chatgpt-bottom-line-emoji-012',
    description: 'Heading with leading circle emoji and English label preceding Persian body.',
    text: '🔴 Bottom line:',
    expected: 'ltr',
    tags: ['fa', 'chatgpt', 'emoji-heading', 'real-world']
  },
  {
    id: 'fa-chatgpt-memory-hook-emoji-013',
    description: 'Section label with brain emoji and Persian title.',
    text: '🧠 تصویر ذهنی',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'emoji-heading', 'persian-heading', 'real-world']
  },
  {
    id: 'fa-chatgpt-take-home-emoji-014',
    description: 'Summary callout with key emoji and mixed English-Persian takeaway.',
    text: '🔑 Take-home:',
    expected: 'ltr',
    tags: ['fa', 'chatgpt', 'emoji-heading', 'real-world']
  },
  {
    id: 'fa-chatgpt-reality-emoji-015',
    description: 'Callout with green checkmark emoji and Persian text followed by English medical explanation.',
    text: '✅ واقعیت: ATP deficiency باعث کاهش بقای RBC و splenic destruction میشود.',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'ATP', direction: 'ltr', kind: 'identifier' },
      { text: 'RBC', direction: 'ltr', kind: 'identifier' }
    ],
    tags: ['fa', 'chatgpt', 'emoji-heading', 'medical', 'real-world']
  },
  {
    id: 'fa-chatgpt-quote-persian-016',
    description: 'Persian quotation inside guillemets questioning clinical timing.',
    text: '«پس قبلش چرا مشکل ایجاد نمیکنند؟»',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'quotation', 'guillemets', 'real-world']
  },
  {
    id: 'fa-chatgpt-quote-slang-017',
    description: 'Quoted informal dialogue in Persian clinical mnemonic.',
    text: '«این آشغالِ بیبرق دیگه رد نمیشه.»',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'quotation', 'dialogue', 'real-world']
  },
  {
    id: 'fa-chatgpt-bpg-pathway-018',
    description: 'Complex clinical explanation with 2,3-BPG alphanumeric notation and up-arrow.',
    text: 'PK deficiency = anemia، ولی tissue oxygen delivery نسبتاً بهتر بهخاطر 2,3-BPG↑',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'alphanumeric-formula', 'arrow', 'real-world']
  },
  {
    id: 'fa-chatgpt-table-row-pk-019',
    description: 'Diagnostic table cell with mixed Persian commentary, English symptoms, and minus sign.',
    text: 'chronic DAT− hemolysis، معمولاً no spherocytes، گاهی echinocytes',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'table-cell', 'differential-diagnosis', 'real-world']
  },
  {
    id: 'fa-chatgpt-table-row-aiha-020',
    description: 'Diagnostic table cell with English condition, Persian conjunction, and DAT+ marker.',
    text: 'spherocytes ولی DAT+',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'table-cell', 'real-world']
  },
  {
    id: 'fa-chatgpt-table-row-thalassemia-021',
    description: 'Diagnostic table cell with English hematology term, Persian intensifier, and target cells.',
    text: 'microcytosis شدید + target cells',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'table-cell', 'real-world']
  },
  {
    id: 'fa-chatgpt-decoder-cell-022',
    description: 'Memory hook decoder table cell pairing Persian clinical image with English mechanism.',
    text: '2,3-BPG پرتکننده O₂',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'table-cell', 'real-world']
  },
  {
    id: 'fa-chatgpt-mnemonic-shn-023',
    description: 'Mnemonic list item with English organism name.',
    text: 'Strep pneumo',
    expected: 'ltr',
    tags: ['fa', 'chatgpt', 'mnemonic', 'english-item', 'real-world']
  },
  {
    id: 'fa-chatgpt-active-recall-024',
    description: 'Active recall test question in Persian with clinical lab values and English test names.',
    text: 'یک کودک دارد: Hb 8.5، retic 12%، indirect bilirubin↑، haptoglobin↓، DAT−، splenomegaly، no spherocytes.',
    expected: 'rtl',
    tags: ['fa', 'chatgpt', 'medical', 'lab-values', 'arrows', 'question', 'real-world']
  },
  {
    id: 'fa-chatgpt-encapsulated-intro-025',
    description: 'Full Persian clinical paragraph with embedded English loanwords (encapsulated, spleen, splenectomy).',
    text: 'باکتریهای encapsulated از قبل هم میتوانند عفونت بدهند؛ تفاوت این است که spleen یکی از مهمترین جاهایی است که وقتی این باکتریها وارد خون میشوند، آنها را سریع گیر میاندازد و پاک میکند. بعد از splenectomy این خط دفاعی حذف میشود.',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'encapsulated', direction: 'ltr', kind: 'opposite-direction-run' },
      { text: 'spleen', direction: 'ltr', kind: 'opposite-direction-run' },
      { text: 'splenectomy', direction: 'ltr', kind: 'opposite-direction-run' }
    ],
    tags: ['fa', 'chatgpt', 'medical', 'paragraph', 'embedded-latin', 'real-world']
  },
  {
    id: 'fa-chatgpt-chronic-combo-026',
    description: 'Diagnostic criterion blockquote with English summary inside Persian hematology text.',
    text: 'Unexplained chronic nonimmune hemolytic anemia',
    expected: 'ltr',
    tags: ['fa', 'chatgpt', 'medical', 'english-summary', 'real-world']
  },
  {
    id: 'fa-chatgpt-pathway-process-027',
    description: 'Metabolic process chain showing cellular respiration sequence with arrows.',
    text: 'glucose → glycolysis → mitochondria → lots of ATP',
    expected: 'ltr',
    tags: ['fa', 'chatgpt', 'medical', 'pathway', 'arrows', 'real-world']
  },
  {
    id: 'fa-chatgpt-marginal-zone-028',
    description: 'Numbered Persian list item starting with English immunological cell type (Marginal-zone B cells).',
    text: 'Marginal-zone B cells اینها به polysaccharide capsule خیلی سریع پاسخ میدهند و عمدتاً IgM تولید میکنند.',
    expected: 'rtl',
    expectedIsolations: [
      { text: 'IgM', direction: 'ltr', kind: 'identifier' }
    ],
    tags: ['fa', 'chatgpt', 'medical', 'leading-latin', 'list-item', 'real-world']
  }
];

const targetDir = resolve('corpus', 'fixtures', 'fa');
await mkdir(targetDir, { recursive: true });

const schema = JSON.parse(await readFile(resolve('corpus', 'fixture.schema.json'), 'utf8')) as object;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateFixture: ValidateFunction<unknown> = ajv.compile(schema);

for (const raw of rawCases) {
  const words = numberedWords(raw.text);
  const positions = words.map((_, index) => index + 1);
  const fixture = {
    id: raw.id,
    description: raw.description,
    text: raw.text,
    words,
    expected: raw.expected,
    ...(raw.expected === 'rtl' ? { expectedVisualOrderRightToLeft: positions } : {}),
    ...(raw.expected === 'ltr' ? { expectedVisualOrderLeftToRight: positions } : {}),
    ...(raw.expectedIsolations ? { expectedIsolations: raw.expectedIsolations } : {}),
    tags: raw.tags,
    curation: 'user-provided' as const,
    nativeSpeakerReviewed: false
  };

  if (!validateFixture(fixture)) {
    throw new Error(`${raw.id}: fixture schema validation failed: ${ajv.errorsText(validateFixture.errors)}`);
  }

  const filePath = resolve(targetDir, `${raw.id}.json`);
  await writeFile(filePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
}

console.log(`Generated and validated ${rawCases.length} real-world ChatGPT Persian medical fixtures in ${targetDir}`);
