import { computed, defineComponent, h, type PropType, type Ref } from 'vue';
import { analyzeText, planInlineIsolation, type DetectionOptions, type Direction } from '@bidilens/core';

export function useBidiDirection(source: Ref<string> | (() => string) | string, options: DetectionOptions = {}) {
  return computed(() => {
    const text = typeof source === 'string' ? source : typeof source === 'function' ? source() : source.value;
    return analyzeText(text, options).direction;
  });
}

export const BidiMessage = defineComponent({
  name: 'BidiMessage',
  props: {
    text: { type: String, required: true },
    as: { type: String, default: 'p' },
    className: { type: String, default: 'bidilens-block' },
    fallback: { type: String as PropType<'ltr' | 'rtl' | 'neutral'>, default: 'ltr' },
    strategy: { type: String as PropType<DetectionOptions['strategy']>, default: undefined },
    inheritedDirection: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
    excludeTechnicalTokens: { type: Boolean, default: undefined },
    minimumStrongCharacters: { type: Number, default: undefined },
    majorityThreshold: { type: Number, default: undefined }
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
      const direction: Direction = analysis.direction === 'neutral' ? 'ltr' : analysis.direction;
      const children = [] as ReturnType<typeof h>[];
      let cursor = 0;
      for (const isolation of planInlineIsolation(props.text, direction)) {
        if (cursor < isolation.start) children.push(h('span', props.text.slice(cursor, isolation.start)));
        children.push(h('bdi', { dir: isolation.direction, 'data-bidilens-isolate': '' }, isolation.text));
        cursor = isolation.end;
      }
      if (cursor < props.text.length) children.push(h('span', props.text.slice(cursor)));
      return h(props.as, { dir: direction, class: props.className, style: { textAlign: 'start' } }, children);
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
