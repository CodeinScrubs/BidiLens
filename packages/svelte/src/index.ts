import { writable } from 'svelte/store';
import { analyzeText, type DetectionOptions, type TextAnalysis } from '@bidilens/core';

export interface BidiMessageStore {
  subscribe: (run: (value: TextAnalysis) => void) => () => void;
  setText: (text: string) => void;
  getText: () => string;
}

export function createBidiMessage(text = '', options: DetectionOptions = {}): BidiMessageStore {
  let source = text;
  const store = writable(analyzeText(source, options));
  return {
    subscribe: store.subscribe,
    setText(value: string) {
      source = value;
      store.set(analyzeText(source, options));
    },
    getText() {
      return source;
    }
  };
}
