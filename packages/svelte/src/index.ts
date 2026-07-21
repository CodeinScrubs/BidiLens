import { writable } from 'svelte/store';
import {
  analyzeText,
  createBidiStream,
  planInlineIsolation,
  type BidiInterventionMode,
  type BidiStreamOptions,
  type BidiStreamSnapshot,
  type DetectionOptions,
  type InlineIsolation,
  type TextAnalysis
} from '@bidilens/core';

export interface SvelteBidiAnalysis extends TextAnalysis {
  isolations: InlineIsolation[];
}

export interface SvelteBidiOptions extends DetectionOptions {
  intervention?: BidiInterventionMode;
}

function analyzeForSvelte(text: string, options: SvelteBidiOptions): SvelteBidiAnalysis {
  const analysis = analyzeText(text, options);
  const direction = analysis.direction === 'neutral' ? (options.inheritedDirection ?? 'ltr') : analysis.direction;
  return {
    ...analysis,
    isolations: planInlineIsolation(text, direction, { intervention: options.intervention })
  };
}

export interface BidiMessageStore {
  subscribe: (run: (value: SvelteBidiAnalysis) => void) => () => void;
  setText: (text: string) => void;
  getText: () => string;
}

export function createBidiMessage(text = '', options: SvelteBidiOptions = {}): BidiMessageStore {
  let source = text;
  const store = writable(analyzeForSvelte(source, options));
  return {
    subscribe: store.subscribe,
    setText(value: string) {
      source = value;
      store.set(analyzeForSvelte(source, options));
    },
    getText() {
      return source;
    }
  };
}

export interface SvelteBidiStreamStore {
  subscribe: (run: (value: BidiStreamSnapshot) => void) => () => void;
  push: (chunk: string) => BidiStreamSnapshot;
  setText: (text: string) => BidiStreamSnapshot;
  finish: () => BidiStreamSnapshot;
  reset: (initialText?: string) => BidiStreamSnapshot;
  getText: () => string;
}

export function createStreamingBidiMessage(options: BidiStreamOptions = {}): SvelteBidiStreamStore {
  const stream = createBidiStream(options);
  let source = '';
  const store = writable(stream.snapshot());
  const publish = (snapshot: BidiStreamSnapshot): BidiStreamSnapshot => {
    store.set(snapshot);
    return snapshot;
  };
  return {
    subscribe: store.subscribe,
    push(chunk) {
      source += chunk;
      return publish(stream.push(chunk));
    },
    setText(text) {
      if (text.startsWith(source)) {
        const chunk = text.slice(source.length);
        source = text;
        return publish(chunk ? stream.push(chunk) : stream.snapshot());
      }
      source = text;
      return publish(stream.reset(text));
    },
    finish() {
      return publish(stream.finish());
    },
    reset(initialText = '') {
      source = initialText;
      return publish(stream.reset(initialText));
    },
    getText() {
      return source;
    }
  };
}
