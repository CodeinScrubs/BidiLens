import { describe, expect, it } from 'vitest';
import { unresolvedBidiLensImports } from '../../scripts/lib/bundled-imports.js';

describe('Action bundle module-reference gate', () => {
  it.each([
    'require("@bidilens/core")',
    '__require("@bidilens/core")',
    'require.resolve("@bidilens/core")',
    'import("@bidilens/core")',
    'import { analyzeText } from "@bidilens/core";',
    'export * from "@bidilens/core";',
    'const load = () => require /* comment */ (`@bidilens/core`);'
  ])('rejects executable reference: %s', (source) => {
    expect(unresolvedBidiLensImports(source)).toEqual(['@bidilens/core']);
  });

  it('ignores example strings, comments, and unrelated imports', () => {
    expect(unresolvedBidiLensImports(`
      const example = "import { BidiMessage } from '@bidilens/react';";
      const other = \`require('@bidilens/core')\`;
      // require('@bidilens/html');
      /* import('@bidilens/dom'); */
      const fs = require('node:fs');
    `)).toEqual([]);
  });

  it('still inspects executable expressions embedded in a template', () => {
    expect(unresolvedBidiLensImports('const value = `prefix ${require("@bidilens/core")}`;'))
      .toEqual(['@bidilens/core']);
  });
});
