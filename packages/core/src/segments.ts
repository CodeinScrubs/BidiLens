import { classifyCharacter } from './classify.js';
import { isolateText } from './controls.js';
import { findTechnicalTokenRanges } from './detect.js';
import { needsBidiIntervention } from './intervention.js';
import type { BidiInterventionMode } from './intervention.js';
import type { Direction, DirectionalRun, InlineIsolation } from './types.js';

function attachSourceRanges(text: string, isolations: Omit<InlineIsolation, 'sourceRange'>[]): InlineIsolation[] {
  const codePointAtUtf16 = new Uint32Array(text.length + 1);
  let utf16Offset = 0;
  let codePointOffset = 0;
  for (const character of text) {
    codePointAtUtf16[utf16Offset] = codePointOffset;
    if (character.length === 2) codePointAtUtf16[utf16Offset + 1] = codePointOffset;
    utf16Offset += character.length;
    codePointOffset += 1;
    codePointAtUtf16[utf16Offset] = codePointOffset;
  }
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
  } = {}
): InlineIsolation[] {
  if (!needsBidiIntervention(text, {
    intervention: options.intervention,
    inheritedDirection: blockDirection
  })) return [];
  const technical = options.excludeTechnicalTokens === false ? [] : findTechnicalTokenRanges(text);
  const isolations: Omit<InlineIsolation, 'sourceRange'>[] = technical.map((range) => ({
    text: range.text,
    direction: 'ltr',
    start: range.start,
    end: range.end,
    kind: range.kind
  }));

  if (options.isolateOppositeRuns === false) {
    return attachSourceRanges(text, isolations.sort((a, b) => a.start - b.start));
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

  return attachSourceRanges(text, isolations.sort((a, b) => a.start - b.start || a.end - b.end));
}
