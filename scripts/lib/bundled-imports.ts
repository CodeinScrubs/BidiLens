import ts from 'typescript';

/** Inspect executable module references, not imports quoted in help/examples. */
export function unresolvedBidiLensImports(source: string): string[] {
  const file = ts.createSourceFile('bundle.cjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const references: string[] = [];
  const record = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteralLike(node) && node.text.startsWith('@bidilens/')) {
      references.push(node.text);
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) record(node.moduleSpecifier);
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(expression) && (expression.text === 'require' || expression.text === '__require'))
        || (ts.isPropertyAccessExpression(expression)
          && ts.isIdentifier(expression.expression) && expression.expression.text === 'require'
          && expression.name.text === 'resolve')) {
        record(node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return references;
}
