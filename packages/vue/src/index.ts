import { computed, defineComponent, h, shallowRef, watch, type PropType, type Ref } from 'vue';
import {
  analyzeText,
  createBidiStream,
  needsBidiIntervention,
  planInlineIsolation,
  type BidiInterventionMode,
  type BidiStreamOptions,
  type BidiStreamSnapshot,
  type DetectionOptions,
  type Direction
} from '@bidilens/core';

type TextSource = Ref<string> | (() => string) | string;

function readSource(source: TextSource): string {
  return typeof source === 'string' ? source : typeof source === 'function' ? source() : source.value;
}

export function useBidiDirection(source: TextSource, options: DetectionOptions = {}) {
  return computed(() => analyzeText(readSource(source), options).direction);
}

export interface VueBidiStream {
  snapshot: Readonly<Ref<BidiStreamSnapshot>>;
  reset: () => BidiStreamSnapshot;
  finish: () => BidiStreamSnapshot;
}

export function useBidiStream(source: TextSource, options: BidiStreamOptions = {}): VueBidiStream {
  const stream = createBidiStream(options);
  let previous = '';
  const snapshot = shallowRef(stream.snapshot());
  watch(
    () => readSource(source),
    (text) => {
      if (text.startsWith(previous)) snapshot.value = stream.push(text.slice(previous.length));
      else {
        snapshot.value = stream.reset(text);
      }
      previous = text;
    },
    { immediate: true, flush: 'sync' }
  );
  return {
    snapshot,
    reset: () => {
      previous = '';
      snapshot.value = stream.reset();
      return snapshot.value;
    },
    finish: () => {
      snapshot.value = stream.finish();
      return snapshot.value;
    }
  };
}

export const BidiMessage = defineComponent({
  name: 'BidiMessage',
  props: {
    text: { type: String, required: true },
    as: { type: String, default: 'p' },
    className: { type: String, default: undefined },
    fallback: { type: String as PropType<'ltr' | 'rtl' | 'neutral'>, default: 'ltr' },
    strategy: { type: String as PropType<DetectionOptions['strategy']>, default: undefined },
    inheritedDirection: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
    excludeTechnicalTokens: { type: Boolean, default: undefined },
    minimumStrongCharacters: { type: Number, default: undefined },
    majorityThreshold: { type: Number, default: undefined },
    intervention: { type: String as PropType<BidiInterventionMode>, default: 'auto' }
  },
  setup(props) {
    return () => {
      const detectionOptions: DetectionOptions = { fallback: props.fallback };
      if (props.strategy !== undefined) detectionOptions.strategy = props.strategy;
      if (props.inheritedDirection !== undefined) detectionOptions.inheritedDirection = props.inheritedDirection;
      if (props.excludeTechnicalTokens !== undefined) detectionOptions.excludeTechnicalTokens = props.excludeTechnicalTokens;
      if (props.minimumStrongCharacters !== undefined) detectionOptions.minimumStrongCharacters = props.minimumStrongCharacters;
      if (props.majorityThreshold !== undefined) detectionOptions.majorityThreshold = props.majorityThreshold;
      const analysis = analyzeText(props.text, detectionOptions);
      const direction: Direction = analysis.direction === 'neutral'
        ? (props.inheritedDirection ?? 'ltr')
        : analysis.direction;
      const intervene = direction === 'rtl' || needsBidiIntervention(props.text, {
        intervention: props.intervention,
        inheritedDirection: props.inheritedDirection
      });
      if (!intervene) return h(props.as, props.className ? { class: props.className } : {}, props.text);
      const children = [] as ReturnType<typeof h>[];
      let cursor = 0;
      for (const isolation of planInlineIsolation(props.text, direction, { intervention: props.intervention })) {
        if (cursor < isolation.start) children.push(h('span', props.text.slice(cursor, isolation.start)));
        const tag = isolation.kind === 'code' ? 'code' : 'bdi';
        children.push(h(tag, {
          dir: isolation.direction,
          'data-bidilens-isolate': '',
          'data-bidilens-kind': isolation.kind,
          ...(isolation.kind === 'code' ? { 'data-bidilens-code': '' } : {})
        }, isolation.text));
        cursor = isolation.end;
      }
      if (cursor < props.text.length) children.push(h('span', props.text.slice(cursor)));
      return h(props.as, {
        dir: direction,
        class: props.className ?? 'bidilens-block',
        'data-bidilens-block': '',
        style: { textAlign: 'start' }
      }, children);
    };
  }
});

export const BidiIsolate = defineComponent({
  name: 'BidiIsolate',
  props: { direction: { type: String as PropType<'ltr' | 'rtl' | 'auto'>, default: 'auto' } },
  setup(props, { slots }) {
    return () => h('bdi', { dir: props.direction }, slots.default?.());
  }
});
