<!-- SPDX-License-Identifier: Apache-2.0 -->
# Next.js App Router & React Server Components Integration

## Overview

`@bidilens/react` is fully compatible with Next.js 14 and Next.js 15 (both App Router and Pages Router), including React Server Components (RSC).

---

## Server Component Usage (Zero Client Bundle)

Static or server-rendered text can be analyzed and isolated directly on the server without shipping client JavaScript:

```tsx
// app/blog/[slug]/page.tsx
import { BidiBlock } from '@bidilens/react';

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug);
  return (
    <article>
      <BidiBlock as="h1">{post.title}</BidiBlock>
      <BidiBlock as="div">{post.content}</BidiBlock>
    </article>
  );
}
```

---

## Streaming Chat with Vercel AI SDK

For streaming AI chat applications with `useChat` from the `ai/react` package:

```tsx
'use client';
import { useChat } from 'ai/react';
import { useBidiStream } from '@bidilens/react';
import { useEffect } from 'react';

export function ChatMessage({ content }: { content: string }) {
  const { snapshot, push, reset } = useBidiStream();

  useEffect(() => {
    reset(content);
  }, [content, reset]);

  return (
    <div dir={snapshot.direction} className="message-bubble">
      {snapshot.currentParagraph.text}
    </div>
  );
}
```
