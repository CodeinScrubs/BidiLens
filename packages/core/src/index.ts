export * from './types.js';
export * from './classify.js';
export * from './detect.js';
export * from './controls.js';
export * from './security.js';
export * from './intervention.js';
export * from './segments.js';
export * from './stream.js';
export * from './analysis.js';

// Specification-oriented aliases retained alongside the original concise API.
export { analyzeText as analyzePlainText, detectDirection as detectBaseDirection } from './detect.js';
export { segmentDirectionalRuns as findDirectionalRuns } from './segments.js';
