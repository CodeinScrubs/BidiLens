import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BidiCode, BidiIsolate, BidiMessage } from './index.js';

describe('React adapter', () => {
  it('renders the flagship Persian-majority paragraph RTL', () => {
    const html = renderToStaticMarkup(
      <BidiMessage text="React یک کتابخانه جاوااسکریپت بسیار محبوب است.">
        React یک کتابخانه جاوااسکریپت بسیار محبوب است.
      </BidiMessage>
    );
    expect(html).toContain('dir="rtl"');
  });

  it('renders RTL message semantics', () => {
    const html = renderToStaticMarkup(
      <BidiMessage text="سلام دنیا">سلام دنیا</BidiMessage>
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-bidilens-block');
  });

  it('isolates code and identifiers', () => {
    const html = renderToStaticMarkup(
      <p dir="rtl">
        فایل <BidiCode>src/index.ts</BidiCode> نسخه{' '}
        <BidiIsolate direction="ltr">v2.1.0</BidiIsolate>
      </p>
    );
    expect(html).toContain('data-bidilens-code');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('data-bidilens-isolate');
  });
});
