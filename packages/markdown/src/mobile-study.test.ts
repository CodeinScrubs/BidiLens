// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import MarkdownIt from 'markdown-it';
import { analyzeBidiMarkdown } from './index.js';
import { MOBILE_MEDICAL_MARKDOWN, MOBILE_QUERY_MARKDOWN, QUERY_LITERALS } from '../../../scripts/fixtures/chatgpt-mobile-oct2.js';

describe('October 2 curated mobile Markdown examples', () => {
  it.each([MOBILE_MEDICAL_MARKDOWN, MOBILE_QUERY_MARKDOWN])('preserves source and decoded visible text while adding only presentation metadata', (source) => {
    const report = analyzeBidiMarkdown(new MarkdownIt({ html: false }), source);
    const before = document.createElement('main');
    before.innerHTML = new MarkdownIt({ html: false }).render(source);
    const after = document.createElement('main'); after.innerHTML = report.html;
    expect(report.source).toBe(source);
    expect(after.textContent).toBe(before.textContent);
    expect(report.html).not.toContain('text-align');
  });

  it('separates Persian prose, multiword terms, English formulas, lists and quotes', () => {
    const report = analyzeBidiMarkdown(new MarkdownIt({ html: false }), MOBILE_MEDICAL_MARKDOWN);
    const body = document.createElement('main'); body.innerHTML = report.html;
    expect(body.querySelector('h2')?.getAttribute('dir')).toBe('rtl');
    expect([...body.querySelectorAll('p')].map((element) => element.getAttribute('dir'))).toEqual(['rtl', 'rtl', 'ltr', 'rtl', 'ltr', 'rtl']);
    expect([...body.querySelectorAll('li')].map((element) => element.getAttribute('dir'))).toEqual(['rtl', 'ltr']);
    expect([...body.querySelectorAll('bdi')].map((element) => element.textContent)).toEqual(expect.arrayContaining(['Capsule', 'Macrophage', 'opsonin', 'Pyruvate kinase']));
    expect(body.textContent).toContain('IgG / IgM + C3b → phagocytosis ↑');
    expect(body.textContent).toContain('PEP + ADP → Pyruvate + ATP');
  });

  it('preserves literal query syntax with explicit code boundaries, without interpreting its meaning', () => {
    const report = analyzeBidiMarkdown(new MarkdownIt({ html: false }), MOBILE_QUERY_MARKDOWN);
    const body = document.createElement('main'); body.innerHTML = report.html;
    const code = [...body.querySelectorAll('code')];
    expect(code.map((element) => element.textContent)).toEqual([...QUERY_LITERALS, `${QUERY_LITERALS.join('\n')}\n`]);
    expect(code.map((element) => element.getAttribute('dir'))).toEqual(['ltr', 'ltr', 'ltr', 'ltr']);
  });
});
