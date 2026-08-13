import { classifyCharacter } from './classify.js';
import { isolateText } from './controls.js';
import { findTechnicalTokenRanges } from './detect.js';
import { needsBidiIntervention } from './intervention.js';
import type { BidiInterventionMode } from './intervention.js';
import type { Direction, DirectionalRun, InlineIsolation } from './types.js';

type PlannedIsolation = Omit<InlineIsolation, 'sourceRange'>;

function attachSourceRanges(text: string, isolations: Omit<InlineIsolation, 'sourceRange'>[]): InlineIsolation[] {
  const codePointAtUtf16 = new Uint32Array(text.length + 1);
  let utf16Offset = 0;
  let codePointOffset = 0;
  for (const character of text) {
    codePointAtUtf16.fill(codePointOffset, utf16Offset, utf16Offset + character.length);
    utf16Offset += character.length;
    codePointOffset += 1;
  }
  codePointAtUtf16.fill(codePointOffset, utf16Offset);
  return isolations.map((isolation) => ({
    ...isolation,
    sourceRange: {
      utf16: { start: isolation.start, end: isolation.end },
      codePoint: {
        start: codePointAtUtf16[isolation.start]!,
        end: codePointAtUtf16[isolation.end]!
      }
    }
  }));
}

function resolveNeutralRuns(runs: DirectionalRun[]): DirectionalRun[] {
  const previousStrong: Direction[] = new Array(runs.length).fill('neutral');
  const nextStrong: Direction[] = new Array(runs.length).fill('neutral');
  let previous: Direction = 'neutral';
  let next: Direction = 'neutral';

  for (let index = 0; index < runs.length; index += 1) {
    previousStrong[index] = previous;
    const direction = runs[index]!.direction;
    if (direction !== 'neutral') previous = direction;
  }

  for (let index = runs.length - 1; index >= 0; index -= 1) {
    nextStrong[index] = next;
    const direction = runs[index]!.direction;
    if (direction !== 'neutral') next = direction;
  }

  return runs.map((run, index) => {
    if (run.direction !== 'neutral') return run;
    const before = previousStrong[index] ?? 'neutral';
    const after = nextStrong[index] ?? 'neutral';
    const direction: Direction = before === after && before !== 'neutral'
      ? before
      : before !== 'neutral'
        ? before
        : after;
    return { ...run, direction };
  });
}

function mergeAdjacent(runs: DirectionalRun[]): DirectionalRun[] {
  const merged: DirectionalRun[] = [];
  for (const run of runs) {
    const previous = merged.at(-1);
    if (previous && previous.direction === run.direction) {
      previous.text += run.text;
      previous.end = run.end;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

function trimNeutralBoundaries(text: string, start: number, end: number): { start: number; end: number } {
  while (start < end) {
    const character = text.slice(start).match(/^./su)?.[0];
    if (!character || classifyCharacter(character) !== 'neutral') break;
    start += character.length;
  }
  while (end > start) {
    const character = text.slice(0, end).match(/.$/su)?.[0];
    if (!character || classifyCharacter(character) !== 'neutral') break;
    end -= character.length;
  }
  return { start, end };
}

const HARD_FRAGMENT_SEPARATOR = /[,،;؛:!?؟|]/u;

/**
 * Punctuation separates semantic LTR fragments in an RTL paragraph, while
 * whitespace joins adjacent fragments into one ordered phrase. Without this
 * normalization, two neighboring isolates such as `page` and `97` are
 * reordered as independent RTL atoms.
 */
function normalizeIsolationPlan(text: string, isolations: PlannedIsolation[]): PlannedIsolation[] {
  const split: PlannedIsolation[] = [];
  for (const isolation of isolations) {
    if (isolation.kind !== 'opposite-direction-run') {
      split.push(isolation);
      continue;
    }
    let pieceStart = isolation.start;
    let cursor = isolation.start;
    for (const character of text.slice(isolation.start, isolation.end)) {
      const index = cursor;
      cursor += character.length;
      if (HARD_FRAGMENT_SEPARATOR.test(character)) {
        const trimmed = trimNeutralBoundaries(text, pieceStart, index);
        if (trimmed.start < trimmed.end) {
          split.push({
            ...isolation,
            text: text.slice(trimmed.start, trimmed.end),
            start: trimmed.start,
            end: trimmed.end
          });
        }
        pieceStart = cursor;
      }
    }
    const trimmed = trimNeutralBoundaries(text, pieceStart, isolation.end);
    if (trimmed.start < trimmed.end) {
      split.push({
        ...isolation,
        text: text.slice(trimmed.start, trimmed.end),
        start: trimmed.start,
        end: trimmed.end
      });
    }
  }

  const ordered = split.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: PlannedIsolation[] = [];
  for (const isolation of ordered) {
    const previous = merged.at(-1);
    if (
      previous &&
      previous.direction === isolation.direction &&
      previous.end <= isolation.start &&
      /^\s*$/u.test(text.slice(previous.end, isolation.start))
    ) {
      previous.end = isolation.end;
      previous.text = text.slice(previous.start, previous.end);
      if (previous.kind !== isolation.kind) previous.kind = 'opposite-direction-run';
    } else {
      merged.push({ ...isolation });
    }
  }
  return merged;
}

export function segmentDirectionalRuns(text: string): DirectionalRun[] {
  if (!text) return [];
  const runs: DirectionalRun[] = [];
  let currentDirection: Direction | null = null;
  let currentText = '';
  let start = 0;
  let index = 0;

  for (const character of text) {
    const direction = classifyCharacter(character);
    if (currentDirection === null) {
      currentDirection = direction;
      currentText = character;
      start = index;
    } else if (direction === currentDirection) {
      currentText += character;
    } else {
      runs.push({ text: currentText, direction: currentDirection, start, end: index });
      currentDirection = direction;
      currentText = character;
      start = index;
    }
    index += character.length;
  }

  if (currentDirection !== null) {
    runs.push({ text: currentText, direction: currentDirection, start, end: index });
  }

  return mergeAdjacent(resolveNeutralRuns(runs));
}

export function isolateDirectionalRuns(text: string): string {
  return segmentDirectionalRuns(text)
    .map((run) => isolateText(run.text, run.direction))
    .join('');
}

/**
 * Plans semantic inline boundaries without changing the stored source text.
 * Technical ranges are isolated first; opposite natural-language runs are
 * then isolated only when they differ from the block's base direction.
 */
export function planInlineIsolation(
  text: string,
  blockDirection: Exclude<Direction, 'neutral'>,
  options: {
    excludeTechnicalTokens?: boolean;
    isolateOppositeRuns?: boolean;
    intervention?: BidiInterventionMode | undefined;
    technicalIdentifiers?: readonly string[] | undefined;
  } = {}
): InlineIsolation[] {
  if (!needsBidiIntervention(text, {
    intervention: options.intervention,
    inheritedDirection: blockDirection
  })) return [];
  const technical = options.excludeTechnicalTokens === false
    ? []
    : findTechnicalTokenRanges(text, options.technicalIdentifiers);
  const isolations: Omit<InlineIsolation, 'sourceRange'>[] = technical.map((range) => ({
    text: range.text,
    direction: 'ltr',
    start: range.start,
    end: range.end,
    kind: range.kind
  }));

  if (options.isolateOppositeRuns === false) {
    return attachSourceRanges(text, normalizeIsolationPlan(text, isolations));
  }

  let technicalIndex = 0;
  for (const run of segmentDirectionalRuns(text)) {
    if (run.direction === 'neutral' || run.direction === blockDirection) continue;
    while (technicalIndex < technical.length && technical[technicalIndex]!.end <= run.start) {
      technicalIndex += 1;
    }
    let cursor = run.start;
    for (let index = technicalIndex; index < technical.length; index += 1) {
      const range = technical[index]!;
      if (range.end <= cursor) continue;
      if (range.start >= run.end) break;
      const partEnd = Math.min(range.start, run.end);
      if (cursor < partEnd) {
        const trimmed = trimNeutralBoundaries(text, cursor, partEnd);
        if (trimmed.start < trimmed.end) isolations.push({
          text: text.slice(trimmed.start, trimmed.end),
          direction: run.direction,
          start: trimmed.start,
          end: trimmed.end,
          kind: 'opposite-direction-run'
        });
      }
      cursor = Math.max(cursor, range.end);
      if (cursor >= run.end) break;
    }
    if (cursor < run.end) {
      const trimmed = trimNeutralBoundaries(text, cursor, run.end);
      if (trimmed.start < trimmed.end) isolations.push({
        text: text.slice(trimmed.start, trimmed.end),
        direction: run.direction,
        start: trimmed.start,
        end: trimmed.end,
        kind: 'opposite-direction-run'
      });
    }
  }

  return attachSourceRanges(text, normalizeIsolationPlan(text, isolations));
}
