import { classifyBidiStrongCharacter } from './classify.js';
import { findBidiControls } from './security.js';
import type { ResolvedDirection } from './types.js';

/**
 * `auto` is the non-interference default: ordinary LTR content in an LTR
 * context receives no BidiLens markup or DOM mutation. `always` retains the
 * explicit-annotation behavior for integrations that require stable markers.
 */
export type BidiInterventionMode = 'auto' | 'always';

export interface BidiInterventionOptions {
  intervention?: BidiInterventionMode | undefined;
  inheritedDirection?: ResolvedDirection | undefined;
}

/**
 * Reports whether rendering metadata is needed for a string in its host
 * context. Hidden bidi controls deliberately disable the LTR fast path so an
 * apparently English string cannot bypass bidi-aware handling.
 */
export function needsBidiIntervention(
  text: string,
  options: BidiInterventionOptions = {}
): boolean {
  if (options.intervention === 'always') return true;
  if (findBidiControls(text).length > 0) return true;

  let hasLtr = false;
  for (const character of text) {
    const direction = classifyBidiStrongCharacter(character);
    if (direction === 'rtl') return true;
    if (direction === 'ltr') hasLtr = true;
  }

  return options.inheritedDirection === 'rtl' && (hasLtr || text.length > 0);
}
