import { expect, type Locator, type Page } from '@playwright/test';

export type TestDirection = 'ltr' | 'rtl';

export interface BidiIsolationSnapshot {
  text: string;
  directionAttribute: string | null;
  computedDirection: string;
  unicodeBidi: string;
  kind: string | null;
  tagName: string;
}

export interface BidiBlockSnapshot {
  text: string;
  directionAttribute: string | null;
  computedDirection: string;
  unicodeBidi: string;
  tagName: string;
  hasBlockMarker: boolean;
  isolations: BidiIsolationSnapshot[];
}

export interface ExpectedIsolation {
  text: string;
  direction: TestDirection;
  kind?: string;
  tagName?: string;
}

export interface BidiBlockExpectation {
  text: string;
  direction: TestDirection;
  isolations?: readonly ExpectedIsolation[];
  /** Require `dir`, rather than accepting direction inherited only from CSS. */
  requireExplicitDirection?: boolean;
  /** Require the standard BidiLens block marker. */
  requireBlockMarker?: boolean;
  /** Require each expected inline run to use a CSS/HTML isolation value. */
  requireIsolationCss?: boolean;
  /** Fail when extra isolate elements are present. */
  exactIsolationCount?: boolean;
  tagName?: string;
}

export type BidiValidationIssueCode =
  | 'text-mismatch'
  | 'direction-attribute-mismatch'
  | 'computed-direction-mismatch'
  | 'missing-block-marker'
  | 'tag-mismatch'
  | 'isolation-count-mismatch'
  | 'isolation-text-mismatch'
  | 'isolation-direction-mismatch'
  | 'isolation-kind-mismatch'
  | 'isolation-tag-mismatch'
  | 'isolation-css-mismatch';

export interface BidiValidationIssue {
  code: BidiValidationIssueCode;
  message: string;
  isolationIndex?: number;
}

export interface LogicalTokenGeometry {
  block: { left: number; right: number; width: number };
  token: { left: number; right: number; width: number };
  distanceFromLtrStart: number;
  distanceFromRtlStart: number;
}

function isolationCssValue(value: string): boolean {
  return value === 'isolate' || value === 'isolate-override' || value === 'plaintext';
}

/** Reads only rendered metadata and text. It never changes the host DOM. */
export async function inspectBidiBlock(locator: Locator): Promise<BidiBlockSnapshot> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const isolations = Array.from(element.querySelectorAll('bdi, [data-bidilens-isolate]'))
      .map((isolate) => {
        const isolateStyle = getComputedStyle(isolate);
        return {
          text: isolate.textContent ?? '',
          directionAttribute: isolate.getAttribute('dir'),
          computedDirection: isolateStyle.direction,
          unicodeBidi: isolateStyle.unicodeBidi,
          kind: isolate.getAttribute('data-bidilens-kind'),
          tagName: isolate.tagName.toLowerCase()
        };
      });
    return {
      text: element.textContent ?? '',
      directionAttribute: element.getAttribute('dir'),
      computedDirection: style.direction,
      unicodeBidi: style.unicodeBidi,
      tagName: element.tagName.toLowerCase(),
      hasBlockMarker: element.hasAttribute('data-bidilens-block'),
      isolations
    };
  });
}

/**
 * Produces serializable diagnostics so callers can use this package with
 * custom reporters as well as Playwright's built-in assertions.
 */
export function validateBidiSnapshot(
  snapshot: BidiBlockSnapshot,
  expected: BidiBlockExpectation
): BidiValidationIssue[] {
  const issues: BidiValidationIssue[] = [];
  const requireExplicit = expected.requireExplicitDirection ?? true;
  const requireMarker = expected.requireBlockMarker ?? true;
  const exactIsolations = expected.exactIsolationCount ?? true;
  const requireIsolationCss = expected.requireIsolationCss ?? true;

  if (snapshot.text !== expected.text) {
    issues.push({ code: 'text-mismatch', message: 'Rendered textContent differs from the logical source.' });
  }
  if (requireExplicit && snapshot.directionAttribute !== expected.direction) {
    issues.push({
      code: 'direction-attribute-mismatch',
      message: `Expected dir="${expected.direction}"; received ${JSON.stringify(snapshot.directionAttribute)}.`
    });
  }
  if (snapshot.computedDirection !== expected.direction) {
    issues.push({
      code: 'computed-direction-mismatch',
      message: `Expected computed direction ${expected.direction}; received ${snapshot.computedDirection}.`
    });
  }
  if (requireMarker && !snapshot.hasBlockMarker) {
    issues.push({ code: 'missing-block-marker', message: 'Missing data-bidilens-block marker.' });
  }
  if (expected.tagName && snapshot.tagName !== expected.tagName.toLowerCase()) {
    issues.push({ code: 'tag-mismatch', message: `Expected <${expected.tagName}>; received <${snapshot.tagName}>.` });
  }

  const expectedIsolations = expected.isolations ?? [];
  if (exactIsolations && snapshot.isolations.length !== expectedIsolations.length) {
    issues.push({
      code: 'isolation-count-mismatch',
      message: `Expected ${expectedIsolations.length} isolation(s); received ${snapshot.isolations.length}.`
    });
  }
  for (const [index, expectedIsolation] of expectedIsolations.entries()) {
    const actual = snapshot.isolations[index];
    if (!actual) continue;
    if (actual.text !== expectedIsolation.text) {
      issues.push({
        code: 'isolation-text-mismatch',
        message: `Isolation ${index} text differs from the expected logical run.`,
        isolationIndex: index
      });
    }
    if (actual.directionAttribute !== expectedIsolation.direction
      || actual.computedDirection !== expectedIsolation.direction) {
      issues.push({
        code: 'isolation-direction-mismatch',
        message: `Isolation ${index} is not ${expectedIsolation.direction} in both markup and computed style.`,
        isolationIndex: index
      });
    }
    if (expectedIsolation.kind !== undefined && actual.kind !== expectedIsolation.kind) {
      issues.push({
        code: 'isolation-kind-mismatch',
        message: `Isolation ${index} expected kind ${expectedIsolation.kind}; received ${JSON.stringify(actual.kind)}.`,
        isolationIndex: index
      });
    }
    if (expectedIsolation.tagName !== undefined
      && actual.tagName !== expectedIsolation.tagName.toLowerCase()) {
      issues.push({
        code: 'isolation-tag-mismatch',
        message: `Isolation ${index} expected <${expectedIsolation.tagName}>; received <${actual.tagName}>.`,
        isolationIndex: index
      });
    }
    if (requireIsolationCss && !isolationCssValue(actual.unicodeBidi)) {
      issues.push({
        code: 'isolation-css-mismatch',
        message: `Isolation ${index} computed unicode-bidi is ${actual.unicodeBidi}, not an isolation value.`,
        isolationIndex: index
      });
    }
  }
  return issues;
}

/** Asserts direction, immutable logical text, and ordered inline isolations. */
export async function expectBidiBlock(
  locator: Locator,
  expected: BidiBlockExpectation
): Promise<BidiBlockSnapshot> {
  const snapshot = await inspectBidiBlock(locator);
  const issues = validateBidiSnapshot(snapshot, expected);
  expect(issues, issues.map((issue) => `${issue.code}: ${issue.message}`).join('\n')).toEqual([]);
  return snapshot;
}

/** Selects the element contents and returns the browser's logical selection. */
export async function readLogicalSelection(locator: Locator): Promise<string> {
  return locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return selection?.toString() ?? '';
  });
}

export async function expectLogicalSelection(locator: Locator, expectedText: string): Promise<void> {
  expect(await readLogicalSelection(locator)).toBe(expectedText);
}

/**
 * Requires the test context to grant clipboard permissions for its origin.
 * Clipboard availability still depends on the browser/OS test environment.
 */
export async function expectLogicalClipboard(
  page: Page,
  locator: Locator,
  expectedText: string,
  copyShortcut = process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
): Promise<void> {
  await expectLogicalSelection(locator, expectedText);
  await page.keyboard.press(copyShortcut);
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(expectedText);
}

/** Measures a logical token even when other runs are wrapped in inline markup. */
export async function measureLogicalToken(
  locator: Locator,
  token: string,
  occurrence = 0
): Promise<LogicalTokenGeometry> {
  if (!token) throw new Error('token must not be empty.');
  if (!Number.isInteger(occurrence) || occurrence < 0) throw new Error('occurrence must be a non-negative integer.');

  return locator.evaluate((element, request) => {
    const fullText = element.textContent ?? '';
    let tokenStart = -1;
    let searchFrom = 0;
    for (let index = 0; index <= request.occurrence; index += 1) {
      tokenStart = fullText.indexOf(request.token, searchFrom);
      if (tokenStart < 0) throw new Error(`Token ${JSON.stringify(request.token)} occurrence ${request.occurrence} was not found.`);
      searchFrom = tokenStart + request.token.length;
    }
    const tokenEnd = tokenStart + request.token.length;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Array<{ node: Text; start: number; end: number }> = [];
    let logicalOffset = 0;
    let current: Node | null;
    while ((current = walker.nextNode()) !== null) {
      const text = current.textContent ?? '';
      nodes.push({ node: current as Text, start: logicalOffset, end: logicalOffset + text.length });
      logicalOffset += text.length;
    }
    const first = nodes.find((entry) => tokenStart >= entry.start && tokenStart < entry.end);
    const last = nodes.find((entry) => tokenEnd > entry.start && tokenEnd <= entry.end);
    if (!first || !last) throw new Error('Token could not be mapped to rendered text nodes.');
    const range = document.createRange();
    range.setStart(first.node, tokenStart - first.start);
    range.setEnd(last.node, tokenEnd - last.start);
    const blockRect = element.getBoundingClientRect();
    const tokenRect = range.getBoundingClientRect();
    return {
      block: { left: blockRect.left, right: blockRect.right, width: blockRect.width },
      token: { left: tokenRect.left, right: tokenRect.right, width: tokenRect.width },
      distanceFromLtrStart: Math.abs(tokenRect.left - blockRect.left),
      distanceFromRtlStart: Math.abs(blockRect.right - tokenRect.right)
    };
  }, { token, occurrence });
}

/**
 * Proves that a logical token is nearer the physical start edge selected by
 * the block's base direction. This catches the flagship `dir="auto"` failure.
 */
export async function expectTokenAtBaseStart(
  locator: Locator,
  token: string,
  direction: TestDirection,
  occurrence = 0
): Promise<LogicalTokenGeometry> {
  const geometry = await measureLogicalToken(locator, token, occurrence);
  const startDistance = direction === 'rtl'
    ? geometry.distanceFromRtlStart
    : geometry.distanceFromLtrStart;
  const oppositeDistance = direction === 'rtl'
    ? geometry.distanceFromLtrStart
    : geometry.distanceFromRtlStart;
  expect(startDistance, `${JSON.stringify(token)} should be nearer the ${direction} start edge.`)
    .toBeLessThan(oppositeDistance);
  return geometry;
}
