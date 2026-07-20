import { SPEC_VERSION, schemaIds, schemas } from '@bidilens/spec';

if (SPEC_VERSION !== '0.1.0' || schemas.length !== 5) {
  throw new Error('Unexpected BidiLens schema release.');
}

console.log(JSON.stringify({ version: SPEC_VERSION, blockAnalysis: schemaIds.blockAnalysis }));
