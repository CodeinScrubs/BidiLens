import {
  createBidiStream,
  detectDirection,
  planInlineIsolation,
  type BidiStreamOptions,
  type BidiStreamSnapshot,
  type DetectionOptions,
  type Direction
} from '@bidilens/core';
import {
  createElement,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode
} from 'react';

const useIsomorphicLayoutEffect = typeof globalThis.window === 'undefined' ? useEffect : useLayoutEffect;

export interface UseBidiDirectionOptions extends DetectionOptions {
  fallback?: Direction;
}

export function useBidiDirection(text: string, options: UseBidiDirectionOptions = {}): Direction {
  const { strategy, fallback, inheritedDirection, excludeTechnicalTokens, minimumStrongCharacters, majorityThreshold } = options;
  return useMemo(() => {
    const detection: DetectionOptions = {};
    if (strategy !== undefined) detection.strategy = strategy;
    if (fallback !== undefined) detection.fallback = fallback;
    if (inheritedDirection !== undefined) detection.inheritedDirection = inheritedDirection;
    if (excludeTechnicalTokens !== undefined) detection.excludeTechnicalTokens = excludeTechnicalTokens;
    if (minimumStrongCharacters !== undefined) detection.minimumStrongCharacters = minimumStrongCharacters;
    if (majorityThreshold !== undefined) detection.majorityThreshold = majorityThreshold;
    return detectDirection(text, detection);
  }, [text, strategy, fallback, inheritedDirection, excludeTechnicalTokens, minimumStrongCharacters, majorityThreshold]);
}

function renderIsolatedText(text: string, direction: Exclude<Direction, 'neutral'>): ReactNode {
  const isolations = planInlineIsolation(text, direction);
  if (!isolations.length) return text;
  const children: ReactNode[] = [];
  let cursor = 0;
  isolations.forEach((isolation, index) => {
    if (cursor < isolation.start) children.push(text.slice(cursor, isolation.start));
    const tag = isolation.kind === 'code' ? 'code' : 'bdi';
    children.push(createElement(tag, {
      key: `${isolation.start}-${isolation.end}-${index}`,
      dir: isolation.direction,
      'data-bidilens-isolate': '',
      ...(isolation.kind === 'code' ? { 'data-bidilens-code': '' } : {})
    }, isolation.text));
    cursor = isolation.end;
  });
  if (cursor < text.length) children.push(text.slice(cursor));
  return children;
}

export interface BidiTextProps extends HTMLAttributes<HTMLElement>, UseBidiDirectionOptions {
  as?: ElementType;
  text?: string;
  forceDirection?: Direction;
  isolate?: boolean;
}

export const BidiText = forwardRef<HTMLElement, PropsWithChildren<BidiTextProps>>(function BidiText(
  {
    as = 'span',
    text,
    children,
    forceDirection,
    isolate = false,
    strategy,
    fallback = 'ltr',
    inheritedDirection,
    excludeTechnicalTokens,
    minimumStrongCharacters,
    majorityThreshold,
    style,
    ...rest
  },
  ref
) {
  const content = text ?? (typeof children === 'string' ? children : '');
  const detectionOptions: UseBidiDirectionOptions = { fallback };
  if (strategy !== undefined) detectionOptions.strategy = strategy;
  if (minimumStrongCharacters !== undefined) detectionOptions.minimumStrongCharacters = minimumStrongCharacters;
  if (majorityThreshold !== undefined) detectionOptions.majorityThreshold = majorityThreshold;
  if (inheritedDirection !== undefined) detectionOptions.inheritedDirection = inheritedDirection;
  if (excludeTechnicalTokens !== undefined) detectionOptions.excludeTechnicalTokens = excludeTechnicalTokens;
  const detected = useBidiDirection(content, detectionOptions);
  const direction = forceDirection ?? detected;
  const renderedContent = typeof (children ?? text) === 'string' && direction !== 'neutral'
    ? renderIsolatedText(String(children ?? text), direction)
    : children ?? text;
  const mergedStyle: CSSProperties = {
    textAlign: 'start',
    ...(isolate ? { unicodeBidi: 'isolate' as const } : {}),
    ...style
  };

  return createElement(as, {
    ...rest,
    ref,
    dir: direction === 'neutral' ? undefined : direction,
    'data-bidilens-block': isolate ? undefined : '',
    'data-bidilens-isolate': isolate ? '' : undefined,
    style: mergedStyle
  }, renderedContent);
});

export interface BidiMessageProps extends Omit<BidiTextProps, 'as' | 'isolate'> {
  as?: ElementType;
}

export const BidiMessage = forwardRef<HTMLElement, PropsWithChildren<BidiMessageProps>>(function BidiMessage(
  { as = 'article', ...props },
  ref
) {
  return <BidiText {...props} as={as} ref={ref} isolate={false} />;
});

export interface BidiIsolateProps extends Omit<HTMLAttributes<HTMLElement>, 'dir'> {
  children: ReactNode;
  direction?: Direction | 'auto';
  as?: ElementType;
}

export const BidiIsolate = forwardRef<HTMLElement, BidiIsolateProps>(function BidiIsolate(
  { children, direction = 'auto', as = 'bdi', style, ...rest },
  ref
) {
  return createElement(as, {
    ...rest,
    ref,
    dir: direction === 'neutral' ? 'auto' : direction,
    'data-bidilens-isolate': '',
    style: { unicodeBidi: 'isolate', ...style }
  }, children);
});

export interface BidiCodeProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

export const BidiCode = forwardRef<HTMLElement, PropsWithChildren<BidiCodeProps>>(function BidiCode(
  { as = 'code', children, style, ...rest },
  ref
) {
  return createElement(as, {
    ...rest,
    ref,
    dir: 'ltr',
    'data-bidilens-code': '',
    style: { direction: 'ltr', textAlign: 'left', unicodeBidi: 'isolate', ...style }
  }, children);
});

export interface UseBidiStreamResult {
  snapshot: BidiStreamSnapshot;
  reset: () => void;
  finish: () => void;
}

function bidiStreamOptionsKey(options: BidiStreamOptions): string {
  return JSON.stringify([
    options.strategy ?? null,
    options.fallback ?? null,
    options.majorityThreshold ?? null,
    options.lockAfterStrongCharacters ?? null,
    options.lockMargin ?? null,
    options.paragraphSeparator?.source ?? null,
    options.paragraphSeparator?.flags ?? null
  ]);
}

export function useBidiStream(
  text: string,
  options: BidiStreamOptions = {},
  completed = false
): UseBidiStreamResult {
  const optionsKey = bidiStreamOptionsKey(options);
  const stateRef = useRef<{
    stream: ReturnType<typeof createBidiStream>;
    previousText: string;
    optionsKey: string;
    snapshot: BidiStreamSnapshot;
    completed: boolean;
  } | null>(null);
  if (stateRef.current === null) {
    const stream = createBidiStream(options);
    let initial = text ? stream.push(text) : stream.snapshot();
    if (completed) initial = stream.finish();
    stateRef.current = {
      stream,
      previousText: text,
      optionsKey,
      snapshot: initial,
      completed
    };
  }
  const [snapshot, setSnapshot] = useState(() => stateRef.current!.snapshot);

  useIsomorphicLayoutEffect(() => {
    const state = stateRef.current!;
    if (state.optionsKey !== optionsKey || (state.completed && (text !== state.previousText || !completed))) {
      const stream = createBidiStream(options);
      let next = text ? stream.push(text) : stream.snapshot();
      if (completed) next = stream.finish();
      stateRef.current = { stream, previousText: text, optionsKey, snapshot: next, completed };
      setSnapshot(next);
      return;
    }
    const previous = state.previousText;
    let next = state.snapshot;
    if (text !== previous) {
      if (text.startsWith(previous)) {
        const chunk = text.slice(previous.length);
        next = state.stream.push(chunk);
      } else {
        state.stream.reset();
        next = text ? state.stream.push(text) : state.stream.snapshot();
      }
      state.previousText = text;
    }
    if (completed && !state.completed) next = state.stream.finish();
    state.completed = completed;
    state.snapshot = next;
    setSnapshot(next);
  }, [text, optionsKey, completed]);

  return {
    snapshot,
    reset: () => {
      const state = stateRef.current!;
      state.previousText = '';
      state.completed = false;
      state.snapshot = state.stream.reset();
      setSnapshot(state.snapshot);
    },
    finish: () => {
      const state = stateRef.current!;
      if (state.snapshot.finished) return;
      state.completed = true;
      state.snapshot = state.stream.finish();
      setSnapshot(state.snapshot);
    }
  };
}

export interface StreamingBidiMessageProps extends Omit<BidiMessageProps, 'text' | 'forceDirection'> {
  text: string;
  streamOptions?: BidiStreamOptions;
  completed?: boolean;
}

export const StreamingBidiMessage = forwardRef<HTMLElement, StreamingBidiMessageProps>(function StreamingBidiMessage(
  { text, streamOptions, completed = false, children, ...props },
  ref
) {
  const { snapshot } = useBidiStream(text, streamOptions, completed);
  return (
    <BidiMessage {...props} ref={ref} text={text} forceDirection={snapshot.direction}>
      {children ?? text}
    </BidiMessage>
  );
});
