/**
 * Playground 演示子组件精细优化脚本
 *
 * 1. 分析组件模板中使用的所有变量/函数
 * 2. 对 script setup 划分为声明 chunk
 * 3. 运行依赖传递追溯，识别所有必需的局部变量
 * 4. 重写解构声明（仅保留被用到的解构项）
 * 5. 重写 imports 导入（仅保留被用到的导入项）
 * 6. 移除所有未被使用的变量声明、函数声明和副作用
 * 7. 去掉顶部的 // @ts-nocheck，还原为强类型安全状态
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.resolve(__dirname, '..', 'src/views/playground/components');

// JS/TS 关键字，不作为局部变量处理
const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'import', 'export', 'default', 'from', 'as', 'async', 'await', 'return',
  'if', 'else', 'for', 'each', 'in', 'of', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally',
  'true', 'false', 'null', 'undefined', 'void', 'new', 'delete', 'typeof', 'instanceof', 'this', 'class', 'extends', 'super',
  'window', 'document', 'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'JSON', 'Map', 'Set'
]);

function getUsedNamesInTemplate(templateContent, styleContent) {
  const text = templateContent + ' ' + (styleContent || '');
  const matches = text.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
  return new Set(matches);
}

function parseImport(line) {
  // 匹配 import { a, b } from "..." 或 import a from "..."
  const multiMatch = line.match(/import\s*\{\s*([^}]+)\s*\}\s*from/);
  const defaultMatch = line.match(/import\s+(\w+)\s+from/);

  if (multiMatch) {
    const imports = multiMatch[1].split(',').map(s => {
      const raw = s.trim();
      let name = raw.split(/\s+as\s+/)[0].trim();
      if (name.startsWith('type ')) {
        name = name.slice(5).trim();
      }
      return { name, raw };
    }).filter(x => x.name);
    return { type: 'multi', imports, line };
  } else if (defaultMatch) {
    return { type: 'default', names: [defaultMatch[1]], line };
  }
  return { type: 'other', names: [], line };
}

function processSubComponent(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 提取 script, template, style
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

  if (!scriptMatch || !templateMatch) return;

  let scriptContent = scriptMatch[1].trim();

  // 去掉顶部的 // @ts-nocheck
  if (scriptContent.startsWith('// @ts-nocheck')) {
    scriptContent = scriptContent.replace('// @ts-nocheck', '').trim();
  }

  const templateContent = templateMatch[1];
  const styleContent = styleMatch ? styleMatch[1] : '';

  // 获取 template 中出现过的全部变量名
  const usedInTemplate = getUsedNamesInTemplate(templateContent, styleContent);

  const scriptLines = scriptContent.split('\n');

  // 分离 imports 和 body 行
  const importDeclarations = [];
  const bodyLines = [];
  let inImport = false;
  let currentImportText = '';

  for (let i = 0; i < scriptLines.length; i++) {
    const line = scriptLines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('import ')) {
      if (line.includes(' from ')) {
        importDeclarations.push(parseImport(line));
      } else {
        inImport = true;
        currentImportText = line;
      }
      continue;
    }

    if (inImport) {
      currentImportText += '\n' + line;
      if (line.includes(' from ')) {
        inImport = false;
        importDeclarations.push(parseImport(currentImportText));
        currentImportText = '';
      }
      continue;
    }

    bodyLines.push(line);
  }

  const bodyText = bodyLines.join('\n');

  // 切分 body 声明为 chunks
  const rawChunks = [];
  let currentChunkLines = [];
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    const trimmed = line.trim();

    const isNewStart = (braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) && (
      trimmed.startsWith('const ') ||
      trimmed.startsWith('let ') ||
      trimmed.startsWith('var ') ||
      trimmed.startsWith('function ') ||
      trimmed.startsWith('onMounted(') ||
      trimmed.startsWith('onUnmounted(') ||
      trimmed.startsWith('watch(') ||
      trimmed.startsWith('defineProps') ||
      trimmed.startsWith('type ') ||
      trimmed.startsWith('interface ')
    );

    if (isNewStart && currentChunkLines.length > 0) {
      rawChunks.push(currentChunkLines.join('\n'));
      currentChunkLines = [];
    }

    currentChunkLines.push(line);

    // 粗略跟踪括号匹配以支持跨行块
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '{') braceDepth++;
      else if (c === '}') braceDepth--;
      else if (c === '(') parenDepth++;
      else if (c === ')') parenDepth--;
      else if (c === '[') bracketDepth++;
      else if (c === ']') bracketDepth--;
    }
  }
  if (currentChunkLines.length > 0) {
    rawChunks.push(currentChunkLines.join('\n'));
  }

  // 解析每个 chunk 产出的变量和引用的变量
  const chunks = rawChunks.map(text => {
    const declaredVars = [];
    const referencedVars = [];

    // 匹配 declared vars
    // 1. 解构 const { a, b } =
    const destructuringMatch = text.match(/^(?:const|let|var)\s*\{\s*([^}]+)\s*\}\s*[:=]/);
    if (destructuringMatch) {
      const vars = destructuringMatch[1]
        .split(',')
        .map(s => s.trim().split(':')[0].trim()) // 处理 a: b 重命名
        .filter(s => s && !s.startsWith('//') && !s.startsWith('/*'));
      declaredVars.push(...vars);
    } else {
      // 2. 普通声明 const xxx = 或 let xxx =
      const normalMatch = text.match(/^(?:const|let|var)\s*(\w+)\s*[:=]/);
      if (normalMatch) {
        declaredVars.push(normalMatch[1]);
      } else {
        // 3. 函数 function xxx()
        const funcMatch = text.match(/^function\s+(\w+)/);
        if (funcMatch) {
          declaredVars.push(funcMatch[1]);
        } else {
          // 4. 类型声明 type xxx = 或 interface xxx
          const typeMatch = text.trim().match(/^(?:type|interface)\s+(\w+)/);
          if (typeMatch) {
            declaredVars.push(typeMatch[1]);
          }
        }
      }
    }

    // 提取所有引用的标识符
    const allWords = text.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
    for (const word of allWords) {
      if (!KEYWORDS.has(word) && !declaredVars.includes(word)) {
        referencedVars.push(word);
      }
    }

    return { text, declaredVars, referencedVars, isDestructuring: !!destructuringMatch };
  });

  // 依赖传递闭包计算
  const keepVars = new Set(usedInTemplate);

  let changed = true;
  while (changed) {
    changed = false;
    for (const chunk of chunks) {
      const hasKeepVar = chunk.declaredVars.some(v => keepVars.has(v));

      // 细化副作用 chunk 保留的判断：
      // 如果一个副作用 chunk 包含了 template 或已被保留变量所引用的名字，或者它包含 watch, onMounted 等生命周期/框架行为，我们才保留它并传递依赖
      const isLifecycleEffect = chunk.declaredVars.length === 0 && (
        chunk.text.includes('onMounted') ||
        chunk.text.includes('onUnmounted') ||
        chunk.text.includes('onBeforeUnmount') ||
        chunk.text.includes('watch')
      );

      if (hasKeepVar || isLifecycleEffect) {
        for (const refVar of chunk.referencedVars) {
          if (!keepVars.has(refVar)) {
            keepVars.add(refVar);
            changed = true;
          }
        }
      }
    }
  }

  // 重写和保留 chunks
  const finalChunksText = [];
  const keepVarsUsed = new Set();

  for (const chunk of chunks) {
    const hasKeepVar = chunk.declaredVars.some(v => keepVars.has(v));
    const isLifecycleEffect = chunk.declaredVars.length === 0 && (
      chunk.text.includes('onMounted') ||
      chunk.text.includes('onUnmounted') ||
      chunk.text.includes('onBeforeUnmount') ||
      chunk.text.includes('watch')
    );

    if (isLifecycleEffect) {
      finalChunksText.push(chunk.text);
      chunk.referencedVars.forEach(v => keepVarsUsed.add(v));
    } else if (hasKeepVar) {
      if (chunk.isDestructuring) {
        // 解构需要精细重构，只保留 keepVars 中的变量
        const lines = chunk.text.split('\n');
        const rewrittenLines = [];

        for (const line of lines) {
          // 如果是一行中包含变量
          const declMatch = line.match(/^\s*(\w+)\s*,?\s*$/);
          const renameMatch = line.match(/^\s*(\w+)\s*:\s*(\w+)\s*,?\s*$/);

          if (declMatch) {
            const varName = declMatch[1];
            if (keepVars.has(varName)) {
              rewrittenLines.push(line);
              keepVarsUsed.add(varName);
            } else {
              // 不保留，跳过或注释
            }
          } else if (renameMatch) {
            const destName = renameMatch[1]; // 解构的源变量
            const targetName = renameMatch[2]; // 重命名后的变量
            if (keepVars.has(targetName) || keepVars.has(destName)) {
              rewrittenLines.push(line);
              keepVarsUsed.add(targetName);
              keepVarsUsed.add(destName);
            }
          } else {
            // 头行（const {）和尾行（} = store）保持原样
            rewrittenLines.push(line);
          }
        }

        // 检查重写后的解构大括号内部是否有任何变量。如果为空，则整个解构可以直接丢弃
        const isBraceEmpty = rewrittenLines.join('\n').match(/\{\s*\}/);
        if (!isBraceEmpty) {
          finalChunksText.push(rewrittenLines.join('\n'));
          chunk.referencedVars.forEach(v => keepVarsUsed.add(v));
        }
      } else {
        // 普通变量声明或函数，直接保留
        finalChunksText.push(chunk.text);
        chunk.declaredVars.forEach(v => keepVarsUsed.add(v));
        chunk.referencedVars.forEach(v => keepVarsUsed.add(v));
      }
    }
  }

  // 清理并重写 imports
  const finalImportsText = [];
  for (const imp of importDeclarations) {
    if (imp.type === 'multi') {
      const usedImports = imp.imports.filter(x => keepVarsUsed.has(x.name) || usedInTemplate.has(x.name));
      if (usedImports.length > 0) {
        // 重写多重导入，例如 import { ref, computed } from "vue" 只保留用到的
        let newImportLine = imp.line;
        newImportLine = newImportLine.replace(/\{\s*([^}]+)\s*\}/, `{ ${usedImports.map(x => x.raw).join(', ')} }`);
        finalImportsText.push(newImportLine);
      }
    } else if (imp.type === 'default') {
      const defaultName = imp.names[0];
      if (keepVarsUsed.has(defaultName) || usedInTemplate.has(defaultName)) {
        finalImportsText.push(imp.line);
      }
    } else {
      // 其它导入（如无命名导入）保留
      finalImportsText.push(imp.line);
    }
  }

  // 合并生成最后的 script setup
  const cleanScriptBody = [
    ...finalImportsText,
    '',
    ...finalChunksText
  ].join('\n').trim();

  const newContent = [
    '<script setup lang="ts">',
    cleanScriptBody,
    '</script>',
    '',
    '<template>',
    templateContent,
    '</template>',
    '',
    styleMatch ? styleMatch[0].trim() : '',
    ''
  ].join('\n');

  fs.writeFileSync(filePath, newContent, 'utf-8');
}

// 遍历处理所有子组件
const subDirs = fs.readdirSync(COMPONENTS_DIR).filter(d => {
  const p = path.join(COMPONENTS_DIR, d);
  return fs.statSync(p).isDirectory() && d.startsWith('playground');
});

let totalCount = 0;
for (const subDir of subDirs) {
  const componentsPath = path.join(COMPONENTS_DIR, subDir, 'components');
  if (!fs.existsSync(componentsPath)) continue;

  const files = fs.readdirSync(componentsPath).filter(f => f.endsWith('.vue'));
  for (const file of files) {
    const filePath = path.join(componentsPath, file);
    try {
      processSubComponent(filePath);
      totalCount++;
    } catch (err) {
      console.error(`Error processing ${subDir}/components/${file}:`, err.message);
    }
  }
}

console.log(`Successfully optimized and cleaned unused variables in ${totalCount} sub-components!`);
