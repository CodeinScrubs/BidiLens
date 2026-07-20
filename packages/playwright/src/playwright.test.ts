/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import type { Locator } from '@playwright/test';
import {
  expectBidiBlock,
  expectLogicalClipboard,
  expectTokenAtBaseStart,
  inspectBidiBlock,
  measureLogicalToken,
  readLogicalSelection,
  validateBidiSnapshot,
  type BidiBlockSnapshot
} from './index.js';

const FLAGSHIP = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';

function locatorFor(element: Element): Locator {
  const candidate = {
    evaluate: async <Result, Argument>(
      callback: (target: Element, argument: Argument) => Result | Promise<Result>,
      argument?: Argument
    ): Promise<Result> => callback(element, argument as Argument)
  };
  return candidate as unknown as Locator;
}

function rectangle(left: number, right: number): DOMRect {
  return {
    x: left,
    y: 0,
    left,
    right,
    top: 0,
    bottom: 20,
    width: right - left,
    height: 20,
    toJSON: () => ({})
  } as DOMRect;
}

function validSnapshot(): BidiBlockSnapshot {
  return {
    text: FLAGSHIP,
    directionAttribute: 'rtl',
    computedDirection: 'rtl',
    unicodeBidi: 'normal',
    tagName: 'p',
    hasBlockMarker: true,
    isolations: [{
      text: 'React',
      directionAttribute: 'ltr',
      computedDirection: 'ltr',
      unicodeBidi: 'isolate',
      kind: 'identifier',
      tagName: 'bdi'
    }]
  };
}

const EXPECTED = {
  text: FLAGSHIP,
  direction: 'rtl' as const,
  tagName: 'p',
  isolations: [{ text: 'React', direction: 'ltr' as const, kind: 'identifier', tagName: 'bdi' }]
};

describe('Playwright bidi assertions', () => {
  it('inspects block and isolation metadata without mutating source order', async () => {
    document.body.innerHTML = `<p dir="rtl" data-bidilens-block>${FLAGSHIP.replace('React', '<bdi dir="ltr" data-bidilens-isolate data-bidilens-kind="identifier">React</bdi>')}</p>`;
    const element = document.querySelector('p');
    expect(element).not.toBeNull();
    const before = element!.outerHTML;
    const snapshot = await inspectBidiBlock(locatorFor(element!));

    expect(snapshot.text).toBe(FLAGSHIP);
    expect(snapshot.directionAttribute).toBe('rtl');
    expect(snapshot.computedDirection).toBe('rtl');
    expect(snapshot.tagName).toBe('p');
    expect(snapshot.hasBlockMarker).toBe(true);
    expect(snapshot.isolations).toHaveLength(1);
    expect(snapshot.isolations[0]?.text).toBe('React');
    expect(snapshot.isolations[0]?.directionAttribute).toBe('ltr');
    expect(snapshot.isolations[0]?.computedDirection).toBe('ltr');
    expect(snapshot.isolations[0]?.unicodeBidi).toBe('isolate');
    expect(snapshot.isolations[0]?.kind).toBe('identifier');
    expect(snapshot.isolations[0]?.tagName).toBe('bdi');
    expect(element!.outerHTML).toBe(before);
  });

  it('accepts a fully conforming snapshot and the top-level assertion helper', async () => {
    const snapshot = validSnapshot();
    expect(validateBidiSnapshot(snapshot, EXPECTED)).toEqual([]);

    document.body.innerHTML = `<p dir="rtl" data-bidilens-block><bdi dir="ltr" data-bidilens-isolate data-bidilens-kind="identifier">React</bdi> یک کتابخانه جاوااسکریپت بسیار محبوب است.</p>`;
    const inspected = await expectBidiBlock(locatorFor(document.querySelector('p')!), EXPECTED);
    expect(inspected.text).toBe(FLAGSHIP);
    expect(inspected.isolations).toHaveLength(1);
  });

  it('reports precise block-level failures', () => {
    const snapshot = validSnapshot();
    snapshot.text = 'wrong';
    snapshot.directionAttribute = null;
    snapshot.computedDirection = 'ltr';
    snapshot.hasBlockMarker = false;
    snapshot.tagName = 'div';
    const issues = validateBidiSnapshot(snapshot, EXPECTED);

    expect(issues).toHaveLength(5);
    expect(issues.map((issue) => issue.code)).toEqual([
      'text-mismatch',
      'direction-attribute-mismatch',
      'computed-direction-mismatch',
      'missing-block-marker',
      'tag-mismatch'
    ]);
    expect(issues[0]?.message).toContain('logical source');
    expect(issues[1]?.message).toContain('dir="rtl"');
    expect(issues[2]?.message).toContain('computed direction rtl');
  });

  it('reports ordered isolation failures with their indices', () => {
    const snapshot = validSnapshot();
    snapshot.isolations[0] = {
      text: 'Vue',
      directionAttribute: 'rtl',
      computedDirection: 'rtl',
      unicodeBidi: 'normal',
      kind: 'path',
      tagName: 'span'
    };
    snapshot.isolations.push({ ...snapshot.isolations[0] });
    const issues = validateBidiSnapshot(snapshot, EXPECTED);

    expect(issues).toHaveLength(6);
    expect(issues.map((issue) => issue.code)).toEqual([
      'isolation-count-mismatch',
      'isolation-text-mismatch',
      'isolation-direction-mismatch',
      'isolation-kind-mismatch',
      'isolation-tag-mismatch',
      'isolation-css-mismatch'
    ]);
    expect(issues.slice(1).every((issue) => issue.isolationIndex === 0)).toBe(true);
    expect(issues[1]?.message).toContain('Isolation 0');
    expect(issues[3]?.message).toContain('identifier');
    expect(issues[5]?.message).toContain('normal');
  });

  it('supports host markup without BidiLens markers when explicitly configured', () => {
    const snapshot = validSnapshot();
    snapshot.directionAttribute = null;
    snapshot.hasBlockMarker = false;
    snapshot.isolations = [];
    const issues = validateBidiSnapshot(snapshot, {
      text: FLAGSHIP,
      direction: 'rtl',
      requireExplicitDirection: false,
      requireBlockMarker: false,
      exactIsolationCount: false
    });
    expect(issues).toEqual([]);
  });

  it('preserves the logical selection across nested opposite-direction runs', async () => {
    document.body.innerHTML = `<p dir="rtl"><span>پیشوند </span><bdi dir="ltr">React API</bdi><span> پسوند.</span></p>`;
    const element = document.querySelector('p')!;
    const before = element.textContent;
    const selected = await readLogicalSelection(locatorFor(element));
    expect(selected).toBe('پیشوند React API پسوند.');
    expect(element.textContent).toBe(before);
    expect(window.getSelection()?.toString()).toBe(selected);
  });

  it('can relax exact isolation count and CSS checks independently', () => {
    const snapshot = validSnapshot();
    snapshot.isolations.push({ ...snapshot.isolations[0]!, text: 'extra' });
    snapshot.isolations[0]!.unicodeBidi = 'normal';
    const relaxed = validateBidiSnapshot(snapshot, {
      ...EXPECTED,
      exactIsolationCount: false,
      requireIsolationCss: false
    });
    expect(relaxed).toEqual([]);
    expect(snapshot.isolations).toHaveLength(2);
  });

  it('measures tokens across nested text nodes and supports occurrences', async () => {
    document.body.innerHTML = '<p><span>React </span><bdi>کتاب</bdi><span> React</span></p>';
    const element = document.querySelector('p')!;
    element.getBoundingClientRect = () => rectangle(0, 200);
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value(this: Range) {
        return this.toString() === 'React کتاب' ? rectangle(120, 190) : rectangle(140, 190);
      }
    });

    const spanning = await measureLogicalToken(locatorFor(element), 'React کتاب');
    expect(spanning.block).toEqual({ left: 0, right: 200, width: 200 });
    expect(spanning.token).toEqual({ left: 120, right: 190, width: 70 });
    expect(spanning.distanceFromLtrStart).toBe(120);
    expect(spanning.distanceFromRtlStart).toBe(10);

    const second = await measureLogicalToken(locatorFor(element), 'React', 1);
    expect(second.token.width).toBe(50);
    expect(second.distanceFromRtlStart).toBe(10);
  });

  it('asserts the physical base-start edge for both directions', async () => {
    document.body.innerHTML = '<p>React یک کتابخانه است.</p>';
    const element = document.querySelector('p')!;
    element.getBoundingClientRect = () => rectangle(0, 200);
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => rectangle(150, 195)
    });
    const rtl = await expectTokenAtBaseStart(locatorFor(element), 'React', 'rtl');
    expect(rtl.distanceFromRtlStart).toBe(5);
    expect(rtl.distanceFromLtrStart).toBe(150);

    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => rectangle(5, 50)
    });
    const ltr = await expectTokenAtBaseStart(locatorFor(element), 'React', 'ltr');
    expect(ltr.distanceFromLtrStart).toBe(5);
    expect(ltr.distanceFromRtlStart).toBe(150);
  });

  it('rejects invalid token measurement requests with actionable errors', async () => {
    document.body.innerHTML = '<p>Hello world</p>';
    const locator = locatorFor(document.querySelector('p')!);
    await expect(measureLogicalToken(locator, '')).rejects.toThrow('token must not be empty');
    await expect(measureLogicalToken(locator, 'Hello', -1)).rejects.toThrow('non-negative integer');
    await expect(measureLogicalToken(locator, 'missing')).rejects.toThrow('was not found');
  });

  it('selects, copies, and verifies the logical source through a page adapter', async () => {
    document.body.innerHTML = `<p dir="rtl"><bdi dir="ltr">React</bdi> یک کتابخانه است.</p>`;
    const source = document.querySelector('p')!.textContent!;
    const pressed: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: async () => source }
    });
    const page = {
      keyboard: { press: async (shortcut: string) => { pressed.push(shortcut); } },
      evaluate: async <Result>(callback: () => Result | Promise<Result>) => callback()
    };
    await expectLogicalClipboard(page as never, locatorFor(document.querySelector('p')!), source, 'Control+C');
    expect(pressed).toEqual(['Control+C']);
    expect(window.getSelection()?.toString()).toBe(source);
  });
});
