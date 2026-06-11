const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..').replace(/\\/g, '/');
const project = new Project({
  tsConfigFilePath: `${projectDir}/tsconfig.json`,
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths(`${projectDir}/src/utils/**/*.ts`);
const contentFile = project.addSourceFileAtPath(`${projectDir}/src/views/utils-docs/utilsDocsContent.ts`);

const utilityDocsDecl = contentFile.getVariableDeclaration('utilityDocs');
if (!utilityDocsDecl) throw new Error('Could not find utilityDocs');

const arrExpr = utilityDocsDecl.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
if (!arrExpr) throw new Error('utilityDocs is not an array literal');

console.log('Scanning src/utils for JSDoc and updating utilsDocsContent.ts...');

const elements = arrExpr.getElements();
let updatedCount = 0;

console.log('Found elements in utilityDocs array:', elements.length);

for (const element of elements) {
  if (element.getKind() === SyntaxKind.CallExpression) {
    const arg = element.getArguments()[0];
    if (arg && arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const keyProp = arg.getProperty('key');
      if (!keyProp) {
        console.log('No key property found in ObjectLiteralExpression');
        continue;
      }
      const moduleKey = keyProp.getInitializer().getText().replace(/['"]/g, '');
      console.log('Processing module:', moduleKey);

      const functionsProp = arg.getProperty('functions');
      if (!functionsProp) continue;
      const fnArray = functionsProp.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
      if (!fnArray) continue;

      // Read existing defaultTestArgs
      const existingArgsMap = new Map();
      const existingThrowsMap = new Map();

      for (const fnObj of fnArray.getElements()) {
        if (fnObj.getKind() === SyntaxKind.ObjectLiteralExpression) {
          const fnName = fnObj.getProperty('name')?.getInitializer()?.getText()?.replace(/['"]/g, '');
          if (fnName) {
            const defaultArgs = fnObj.getProperty('defaultTestArgs')?.getInitializer()?.getText();
            if (defaultArgs) existingArgsMap.set(fnName, defaultArgs);
            const throwsArr = fnObj.getProperty('throws')?.getInitializer()?.getText();
            if (throwsArr) existingThrowsMap.set(fnName, throwsArr);
          }
        }
      }

      // Now we look into src/utils/${moduleKey}
      const sourceFiles = project.getSourceFiles(`${projectDir}/src/utils/${moduleKey}/**/*.ts`);
      console.log(`Module ${moduleKey}: found ${sourceFiles.length} source files.`);
      const generatedFns = [];

      for (const sourceFile of sourceFiles) {
        // Find exported functions
        const functions = sourceFile.getFunctions().filter(f => f.isExported());
        const arrowFunctions = sourceFile.getVariableDeclarations()
          .filter(v => v.hasExportKeyword() && (v.getInitializerIfKind(SyntaxKind.ArrowFunction) || v.getInitializerIfKind(SyntaxKind.FunctionExpression)));

        const allCallables = [...functions, ...arrowFunctions.map(v => {
          const fn = v.getInitializer();
          return {
            getName: () => v.getName(),
            getJsDocs: () => v.getVariableStatement().getJsDocs(),
            getParameters: () => fn.getParameters(),
            getReturnTypeNode: () => fn.getReturnTypeNode()
          };
        })];

        for (const callable of allCallables) {
          const name = callable.getName();
          if (!name) continue;

          const jsdocs = callable.getJsDocs();
          if (jsdocs.length === 0) continue;

          const jsdoc = jsdocs[0];
          let desc = jsdoc.getDescription().trim() || '暂无描述';
          // Clean up newlines in description
          desc = desc.replace(/\r?\n/g, ' ');

          const astParams = callable.getParameters();
          const astReturnType = callable.getReturnTypeNode()?.getText() || 'any';

          const paramsMap = new Map();
          for (const param of astParams) {
            paramsMap.set(param.getName(), {
              name: param.getName(),
              type: param.getTypeNode()?.getText() || 'any',
              required: !param.isOptional() && !param.hasInitializer(),
              description: ''
            });
          }

          let returns = { type: astReturnType, description: '' };

          for (const tag of jsdoc.getTags()) {
            const tagName = tag.getTagName();
            const text = tag.getText();
            if (tagName === 'param') {
              // Extract description from JSDoc
              const matchWithBracket = text.match(/@param\s+\{([^}]+)\}\s+([^\s]+)\s+(.*)/);
              const matchSimple = text.match(/@param\s+([^\s]+)\s+(.*)/);

              let pName = '';
              let pDesc = '';

              if (matchWithBracket) {
                pName = matchWithBracket[2].replace(/^\[|\]$/g, '');
                pDesc = matchWithBracket[3];
              } else if (matchSimple) {
                pName = matchSimple[1].replace(/^\[|\]$/g, '');
                pDesc = matchSimple[2];
              }

              if (pName && paramsMap.has(pName)) {
                paramsMap.get(pName).description = pDesc.replace(/\r?\n/g, ' ').trim();
              } else if (pName) {
                // In case it's in JSDoc but not in AST (e.g. nested destructured props)
                paramsMap.set(pName, {
                  name: pName,
                  type: matchWithBracket ? matchWithBracket[1] : 'any',
                  required: !text.includes(`[${pName}]`),
                  description: pDesc.replace(/\r?\n/g, ' ').trim()
                });
              }
            } else if (tagName === 'returns' || tagName === 'return') {
              const matchWithBracket = text.match(/@returns?\s+\{([^}]+)\}\s+(.*)/);
              const matchSimple = text.match(/@returns?\s+(.*)/);

              if (matchWithBracket) {
                returns.description = matchWithBracket[2].replace(/\r?\n/g, ' ').trim();
                // We prefer AST return type, but if AST is 'any' and JSDoc has it, use JSDoc
                if (returns.type === 'any') returns.type = matchWithBracket[1];
              } else if (matchSimple) {
                returns.description = matchSimple[1].replace(/\r?\n/g, ' ').trim();
              }
            }
          }

          const params = Array.from(paramsMap.values());

          let fnObjStr = `{\n        name: "${name}",\n        description: "${desc.replace(/"/g, '\\"')}"`;
          if (params.length > 0) fnObjStr += `,\n        params: ${JSON.stringify(params)}`;
          if (returns) fnObjStr += `,\n        returns: ${JSON.stringify(returns)}`;
          if (existingThrowsMap.has(name)) fnObjStr += `,\n        throws: ${existingThrowsMap.get(name)}`;
          if (existingArgsMap.has(name)) fnObjStr += `,\n        defaultTestArgs: ${existingArgsMap.get(name)}`;
          fnObjStr += `\n      }`;
          generatedFns.push(fnObjStr);
        }
      }

      if (generatedFns.length > 0) {
        // Replace the functions array initializer
        functionsProp.setInitializer(`[\n      ${generatedFns.join(',\n      ')}\n    ]`);
        updatedCount++;
      }
    }
  }
}

contentFile.saveSync();
console.log(`✅ Successfully regenerated documentation for ${updatedCount} utility modules.`);
