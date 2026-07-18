import { writable } from 'svelte/store';
import {
  analyzeText,
  createBidiStream,
  planInlineIsolation,
  type BidiStreamOptions,
  type BidiStreamSnapshot,
  type DetectionOptions,
  type InlineIsolation,
  type TextAnalysis
} from '@bidilens/core';

export interface SvelteBidiAnalysis extends TextAnalysis {
  isolations: InlineIsolation[];
}

function analyzeForSvelte(text: string, options: DetectionOptions): SvelteBidiAnalysis {
  const analysis = analyzeText(text, options);
  const direction = analysis.direction === 'neutral' ? (options.inheritedDirection ?? 'ltr') : analysis.direction;
  return { ...analysis, isolations: planInlineIsolation(text, direction) };
}

export interface BidiMessageStore {
  subscribe: (run: (value: SvelteBidiAnalysis) => void) => () => void;
  setText: (text: string) => void;
  getText: () => string;
}

export function createBidiMessage(text = '', options: DetectionOptions = {}): BidiMessageStore {
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
  reset: () => BidiStreamSnapshot;
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
      stream.reset();
      return publish(text ? stream.push(text) : stream.snapshot());
    },
    finish() {
      return publish(stream.finish());
    },
    reset() {
      source = '';
      return publish(stream.reset());
    },
    getText() {
      return source;
    }
  };
}
