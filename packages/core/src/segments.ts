import { classifyCharacter } from './classify.js';
import { isolateText } from './controls.js';
import type { Direction, DirectionalRun } from './types.js';

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
