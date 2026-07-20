import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';
import { analyzeBlock, createBidiStream, scanBidiSecurity } from '@bidilens/core';
import {
  SPEC_VERSION,
  blockAnalysisSchema,
  commonSchema,
  getBidiLensSchema,
  indexSchema,
  isBidiLensSchemaId,
  schemaIds,
  schemas,
  securityReportSchema,
  streamSnapshotSchema
} from './index.js';

const FLAGSHIP = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';

function validator() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  for (const schema of schemas) ajv.addSchema(schema);
  return ajv;
}

describe('@bidilens/spec', () => {
  it('publishes stable, unique, versioned schema identifiers', () => {
    expect(SPEC_VERSION).toBe('0.1.0');
    expect(schemas).toHaveLength(5);
    expect(new Set(schemas.map((schema) => schema.$id)).size).toBe(5);
    expect(schemaIds.common).toContain(':0.1:');
    expect(schemaIds.blockAnalysis).toContain('block-analysis');
    expect(schemaIds.securityReport).toContain('security-report');
    expect(schemaIds.streamSnapshot).toContain('stream-snapshot');
    expect(schemaIds.index).toContain('index');
    expect(commonSchema.$id).toBe(schemaIds.common);
    expect(blockAnalysisSchema.$id).toBe(schemaIds.blockAnalysis);
    expect(securityReportSchema.$id).toBe(schemaIds.securityReport);
    expect(streamSnapshotSchema.$id).toBe(schemaIds.streamSnapshot);
    expect(indexSchema.$id).toBe(schemaIds.index);
    expect(isBidiLensSchemaId(schemaIds.common)).toBe(true);
    expect(isBidiLensSchemaId('https://invalid.example/schema')).toBe(false);
    expect(getBidiLensSchema(schemaIds.blockAnalysis)).toBe(blockAnalysisSchema);
    expect(() => getBidiLensSchema('missing' as typeof schemaIds.index)).toThrow(RangeError);
  });

  it('validates real core block analysis with dual source offsets', () => {
    const ajv = validator();
    const validate = ajv.getSchema(schemaIds.blockAnalysis)!;
    const analysis = analyzeBlock(`😀 ${FLAGSHIP}`);
    expect(validate(analysis), JSON.stringify(validate.errors)).toBe(true);
    expect(analysis.direction).toBe('rtl');
    expect(analysis.isolations.length).toBeGreaterThan(0);
    expect(analysis.isolations[0]?.sourceRange.utf16.start).toBe(3);
    expect(analysis.isolations[0]?.sourceRange.codePoint.start).toBe(2);
    expect(analysis.isolations[0]?.sourceRange.utf16.end).toBe(8);
    expect(analysis.isolations[0]?.sourceRange.codePoint.end).toBe(7);
    expect(validate({ ...analysis, confidence: 2 })).toBe(false);
    expect(validate({ ...analysis, direction: 'sideways' })).toBe(false);
    expect(validate({ ...analysis, source: analysis.text })).toBe(false);
  });

  it('validates safe and dangerous security reports', () => {
    const ajv = validator();
    const validate = ajv.getSchema(schemaIds.securityReport)!;
    const safe = scanBidiSecurity(FLAGSHIP, { mode: 'audit' });
    const dangerous = scanBidiSecurity(`safe\u202Ehidden\u202C`, { mode: 'strict' });
    expect(validate(safe), JSON.stringify(validate.errors)).toBe(true);
    expect(safe.safe).toBe(true);
    expect(safe.findings).toHaveLength(0);
    expect(validate(dangerous), JSON.stringify(validate.errors)).toBe(true);
    expect(dangerous.safe).toBe(false);
    expect(dangerous.shouldBlock).toBe(true);
    expect(dangerous.controls).toHaveLength(2);
    expect(dangerous.findings.length).toBeGreaterThanOrEqual(2);
    expect(validate({ ...safe, mode: 'delete' })).toBe(false);
  });

  it('validates incremental and finished stream snapshots', () => {
    const ajv = validator();
    const validate = ajv.getSchema(schemaIds.streamSnapshot)!;
    const stream = createBidiStream();
    const first = stream.push('React ');
    const second = stream.push('یک کتابخانه محبوب است.');
    const final = stream.finish();
    expect(validate(first), JSON.stringify(validate.errors)).toBe(true);
    expect(first.finished).toBe(false);
    expect(validate(second), JSON.stringify(validate.errors)).toBe(true);
    expect(second.text).toBe(FLAGSHIP.replace('جاوااسکریپت بسیار ', ''));
    expect(validate(final), JSON.stringify(validate.errors)).toBe(true);
    expect(final.finished).toBe(true);
    expect(final.direction).toBe('rtl');
    expect(validate({ ...final, paragraphs: [{}] })).toBe(false);
  });

  it('resolves all references and rejects values outside the union', () => {
    const ajv = validator();
    const validate = ajv.getSchema(indexSchema.$id)!;
    expect(ajv.getSchema(commonSchema.$id)).toBeDefined();
    expect(ajv.getSchema(blockAnalysisSchema.$id)).toBeDefined();
    expect(ajv.getSchema(securityReportSchema.$id)).toBeDefined();
    expect(ajv.getSchema(streamSnapshotSchema.$id)).toBeDefined();
    expect(validate(analyzeBlock(FLAGSHIP))).toBe(true);
    expect(validate(scanBidiSecurity(FLAGSHIP))).toBe(true);
    expect(validate(createBidiStream().finish())).toBe(true);
    expect(validate({ direction: 'rtl' })).toBe(false);
    expect(validate(null)).toBe(false);
  });
});
