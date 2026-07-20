import { validateBidiSnapshot } from '@bidilens/playwright';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const issues = validateBidiSnapshot({
  text: source,
  directionAttribute: 'rtl',
  computedDirection: 'rtl',
  unicodeBidi: 'normal',
  tagName: 'p',
  hasBlockMarker: true,
  isolations: [{
    text: 'React',
    directionAttribute: 'ltr',
    computedDirection: 'ltr',
    unicodeBidi: 'isolate',
    kind: 'identifier',
    tagName: 'bdi'
  }]
}, {
  text: source,
  direction: 'rtl',
  tagName: 'p',
  isolations: [{ text: 'React', direction: 'ltr', kind: 'identifier', tagName: 'bdi' }]
});

if (issues.length > 0) throw new Error(JSON.stringify(issues));
console.log('Bidi Playwright snapshot validation passed.');
