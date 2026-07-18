import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

interface CycloneDxDocument {
  bomFormat?: string;
  specVersion?: string;
  components?: SbomComponent[];
  dependencies?: Array<{ ref?: string; dependsOn?: string[] }>;
  metadata?: { component?: SbomComponent & { components?: SbomComponent[] } };
}

interface SbomComponent {
  'bom-ref'?: string;
  name?: string;
  version?: string;
  purl?: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const path = resolve(process.cwd(), process.argv[2] ?? 'bidilens-sbom.cdx.json');
const document = JSON.parse(await readFile(path, 'utf8')) as CycloneDxDocument;
assert(document.bomFormat === 'CycloneDX', 'SBOM must use the CycloneDX format.');
assert(document.specVersion === '1.7', 'SBOM must use CycloneDX specification 1.7.');
assert(document.metadata?.component?.name === 'bidilens', 'SBOM metadata must identify the BidiLens root project.');
assert(document.components && document.components.length > 0, 'SBOM contains no components.');
assert(document.dependencies && document.dependencies.length > 0, 'SBOM contains no dependency relationships.');

for (const component of document.components) {
  assert(component.name, 'Every SBOM component must have a name.');
  assert(component.version, `${component.name}: SBOM component has no version.`);
  assert(component.purl, `${component.name}@${component.version}: SBOM component has no package URL.`);
}

const inventory = [
  document.metadata.component,
  ...(document.metadata.component.components ?? []),
  ...document.components
];
const references = inventory.map((component) => component['bom-ref']);
assert(references.every((reference): reference is string => Boolean(reference)), 'Every SBOM component must have a bom-ref.');
const knownReferences = new Set(references);
assert(knownReferences.size === references.length, 'SBOM contains duplicate component bom-ref values.');

const dependencyReferences = document.dependencies.map((dependency) => dependency.ref);
assert(dependencyReferences.every((reference): reference is string => Boolean(reference)), 'Every SBOM dependency entry must have a ref.');
assert(new Set(dependencyReferences).size === dependencyReferences.length, 'SBOM contains duplicate dependency ref values.');
for (const dependency of document.dependencies) {
  assert(knownReferences.has(dependency.ref!), `SBOM dependency ref does not resolve: ${dependency.ref}`);
  for (const target of dependency.dependsOn ?? []) {
    assert(knownReferences.has(target), `SBOM dependency target does not resolve: ${target}`);
  }
}

console.log(`SBOM passed: CycloneDX ${document.specVersion}, ${document.components.length} components, ${document.dependencies.length} dependency relationships.`);
