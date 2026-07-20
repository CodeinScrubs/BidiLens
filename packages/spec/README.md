# `@bidilens/spec`

Versioned, language-neutral JSON Schemas for exchanging BidiLens block
analysis, security reports, and stream snapshots across JavaScript, Android,
Dart, Swift, and other implementations.

```bash
npm install @bidilens/spec
```

The package exports the schema objects for JavaScript validators and ships the
same files under `schemas/` for every JSON Schema Draft 7 implementation.
Register `common.schema.json` before the output schemas so their relative
references resolve:

```js
import { Ajv } from 'ajv';
import { schemas, schemaIds } from '@bidilens/spec';

const ajv = new Ajv({ allErrors: true });
for (const schema of schemas) ajv.addSchema(schema);
const validate = ajv.getSchema(schemaIds.blockAnalysis);
```

All ranges are half-open. `utf16` matches JavaScript string indices;
`codePoint` counts Unicode scalar values. Schemas are strict and reject
unknown properties so cross-platform drift is detected early. Schema IDs are
versioned independently of registry URLs and remain stable for the `0.1`
protocol line.
