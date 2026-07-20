import commonSchemaJson from '../schemas/common.schema.json' with { type: 'json' };
import blockAnalysisSchemaJson from '../schemas/block-analysis.schema.json' with { type: 'json' };
import securityReportSchemaJson from '../schemas/security-report.schema.json' with { type: 'json' };
import streamSnapshotSchemaJson from '../schemas/stream-snapshot.schema.json' with { type: 'json' };
import indexSchemaJson from '../schemas/index.schema.json' with { type: 'json' };

/** Deliberately widened so declaration emit does not expose validator-specific literal internals. */
export interface BidiLensJsonSchema {
  readonly $schema: string;
  readonly $id: string;
  readonly title: string;
  readonly [keyword: string]: unknown;
}

export const commonSchema: BidiLensJsonSchema = commonSchemaJson;
export const blockAnalysisSchema: BidiLensJsonSchema = blockAnalysisSchemaJson;
export const securityReportSchema: BidiLensJsonSchema = securityReportSchemaJson;
export const streamSnapshotSchema: BidiLensJsonSchema = streamSnapshotSchemaJson;
export const indexSchema: BidiLensJsonSchema = indexSchemaJson;

export const SPEC_VERSION = '0.1.0' as const;

export const schemaIds = Object.freeze({
  common: 'urn:bidilens:schema:0.1:common',
  blockAnalysis: 'urn:bidilens:schema:0.1:block-analysis',
  securityReport: 'urn:bidilens:schema:0.1:security-report',
  streamSnapshot: 'urn:bidilens:schema:0.1:stream-snapshot',
  index: 'urn:bidilens:schema:0.1:index'
} as const);

/** Ordered so JSON Schema validators can register dependencies first. */
export const schemas = Object.freeze([
  commonSchema,
  blockAnalysisSchema,
  securityReportSchema,
  streamSnapshotSchema,
  indexSchema
] satisfies readonly BidiLensJsonSchema[]);

export type BidiLensSchemaId = (typeof schemaIds)[keyof typeof schemaIds];

const schemaById = new Map<string, BidiLensJsonSchema>(
  schemas.map((schema) => [schema.$id, schema])
);

export function isBidiLensSchemaId(value: string): value is BidiLensSchemaId {
  return schemaById.has(value);
}

export function getBidiLensSchema(id: BidiLensSchemaId): BidiLensJsonSchema {
  const schema = schemaById.get(id);
  if (!schema) throw new RangeError(`Unknown BidiLens schema ID: ${id}`);
  return schema;
}
