import {
  createBidiStream,
  detectDirection,
  type BidiStreamOptions,
  type BidiStreamSnapshot,
  type DetectionOptions,
  type Direction
} from '@bidilens/core';
import {
  createElement,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode
} from 'react';

export interface UseBidiDirectionOptions extends DetectionOptions {
  fallback?: Direction;
}

export function useBidiDirection(text: string, options: UseBidiDirectionOptions = {}): Direction {
  const { strategy, fallback, minimumStrongCharacters, majorityThreshold } = options;
  return useMemo(() => {
    const detection: DetectionOptions = {};
    if (strategy !== undefined) detection.strategy = strategy;
    if (fallback !== undefined) detection.fallback = fallback;
    if (minimumStrongCharacters !== undefined) detection.minimumStrongCharacters = minimumStrongCharacters;
    if (majorityThreshold !== undefined) detection.majorityThreshold = majorityThreshold;
    return detectDirection(text, detection);
  }, [text, strategy, fallback, minimumStrongCharacters, majorityThreshold]);
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
  const detected = useBidiDirection(content, detectionOptions);
  const direction = forceDirection ?? detected;
  const mergedStyle: CSSProperties = {
    textAlign: 'start',
    unicodeBidi: isolate ? 'isolate' : 'plaintext',
    ...style
  };

  return createElement(as, {
    ...rest,
    ref,
    dir: direction === 'neutral' ? undefined : direction,
    'data-bidilens-block': isolate ? undefined : '',
    'data-bidilens-isolate': isolate ? '' : undefined,
    style: mergedStyle
  }, children ?? text);
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
}

export function useBidiStream(text: string, options: BidiStreamOptions = {}): UseBidiStreamResult {
  const optionsKey = JSON.stringify(options);
  const streamRef = useRef(createBidiStream(options));
  const previousTextRef = useRef('');
  const [snapshot, setSnapshot] = useState(() => streamRef.current.snapshot());

  useEffect(() => {
    streamRef.current = createBidiStream(options);
    previousTextRef.current = '';
    setSnapshot(streamRef.current.push(text));
    // optionsKey intentionally represents the serializable option surface.
  }, [optionsKey]);

  useEffect(() => {
    const previous = previousTextRef.current;
    if (text.startsWith(previous)) {
      const chunk = text.slice(previous.length);
      setSnapshot(streamRef.current.push(chunk));
    } else {
      streamRef.current.reset();
      setSnapshot(streamRef.current.push(text));
    }
    previousTextRef.current = text;
  }, [text]);

  return {
    snapshot,
    reset: () => {
      previousTextRef.current = '';
      setSnapshot(streamRef.current.reset());
    }
  };
}

export interface StreamingBidiMessageProps extends Omit<BidiMessageProps, 'text' | 'forceDirection'> {
  text: string;
  streamOptions?: BidiStreamOptions;
}

export const StreamingBidiMessage = forwardRef<HTMLElement, StreamingBidiMessageProps>(function StreamingBidiMessage(
  { text, streamOptions, children, ...props },
  ref
) {
  const { snapshot } = useBidiStream(text, streamOptions);
  return (
    <BidiMessage {...props} ref={ref} text={text} forceDirection={snapshot.direction}>
      {children ?? text}
    </BidiMessage>
  );
});
