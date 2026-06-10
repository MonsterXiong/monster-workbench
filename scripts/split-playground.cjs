/**
 * Playground 组件拆分脚本
 *
 * 对每个 Playground*Demos.vue 文件：
 * 1. 读取原文件
 * 2. 解析出 script setup 中的 imports / props / 顶层变量 / 函数
 * 3. 解析出 template 中每个 v-if/v-else-if 块（按 activeComponentKey 切分）
 * 4. 解析出 style scoped 块
 * 5. 为每个 key 生成独立子组件，只包含该 key 用到的 ref/变量/函数
 * 6. 把原文件重写为 dispatcher（import + 条件渲染子组件）
 *
 * 策略：由于精确的依赖分析太复杂，采用简单策略——
 *        每个子组件直接复制完整的 script 顶层变量，依赖 tree-shaking 去除未使用的。
 *        但我们做一个简化：把整个 script setup 中 defineProps 之后的所有内容作为 "共享状态"
 *        复制到每个子组件中。
 *
 * 实际上更好的方式是直接把每个 v-if section 的完整代码移入子组件，
 * 连同它用到的 refs 和函数一起。
 *
 * 为了稳定性，我们采用以下分步策略：
 * 1. 对每个文件，先识别每个 activeComponentKey -> section 的行号范围
 * 2. 生成 dispatcher 文件
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.resolve(__dirname, '..', 'src/views/playground/components');

// 从文件名到子目录名的映射
const FILE_MAP = {
  'PlaygroundFormDemos.vue': 'playgroundFormDemos',
  'PlaygroundLayoutDemos.vue': 'playgroundLayoutDemos',
  'PlaygroundWorkflowDemos.vue': 'playgroundWorkflowDemos',
  'PlaygroundDataDemos.vue': 'playgroundDataDemos',
  'PlaygroundFoundationDemos.vue': 'playgroundFoundationDemos',
  'PlaygroundNavigationDemos.vue': 'playgroundNavigationDemos',
  'PlaygroundDisplayDemos.vue': 'playgroundDisplayDemos',
  'PlaygroundUtilsDemos.vue': 'playgroundUtilsDemos',
  'PlaygroundActionDemos.vue': 'playgroundActionDemos',
  'PlaygroundFeedbackDemos.vue': 'playgroundFeedbackDemos',
  'PlaygroundLoadingDemos.vue': 'playgroundLoadingDemos',
};

// key -> 组件名转换  e.g. "text-inputs" -> "TextInputs"
function keyToComponentName(prefix, key) {
  const pascal = key
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return `${prefix}${pascal}Demo`;
}

function processFile(fileName) {
  const filePath = path.join(COMPONENTS_DIR, fileName);
  const subDirName = FILE_MAP[fileName];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // 1. 分离 script / template / style
  let scriptStart = -1, scriptEnd = -1;
  let templateStart = -1, templateEnd = -1;
  let styleStart = -1, styleEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^<script\s/)) scriptStart = i;
    if (line.match(/^<\/script>/)) scriptEnd = i;
    if (line.match(/^<template>/)) templateStart = i;
    if (line.match(/^<\/template>/)) templateEnd = i;
    if (line.match(/^<style\s/)) styleStart = i;
    if (line.match(/^<\/style>/)) styleEnd = i;
  }

  const scriptContent = lines.slice(scriptStart, scriptEnd + 1).join('\n');
  const templateContent = lines.slice(templateStart + 1, templateEnd);
  const styleContent = styleStart >= 0 ? lines.slice(styleStart, styleEnd + 1).join('\n') : '';

  // 2. 从 script 中提取 imports 和 props 之后的内容
  const scriptLines = lines.slice(scriptStart + 1, scriptEnd);

  // 找到 imports
  const importLines = [];
  const bodyLines = [];
  let pastImports = false;
  let pastProps = false;

  for (const line of scriptLines) {
    if (!pastImports && (line.startsWith('import ') || line.match(/^\s/) && !pastImports)) {
      importLines.push(line);
      if (!line.includes(' from ') && !line.match(/[};]\s*$/)) continue;
      // multi-line import continues
    } else {
      pastImports = true;
    }
    if (pastImports) {
      bodyLines.push(line);
    }
  }

  // 更好的方法：找到 defineProps 之后的所有内容
  let propsEndIndex = -1;
  for (let i = 0; i < scriptLines.length; i++) {
    if (scriptLines[i].includes('defineProps')) {
      // 找到匹配的闭合
      let depth = 0;
      for (let j = i; j < scriptLines.length; j++) {
        for (const c of scriptLines[j]) {
          if (c === '(' || c === '<') depth++;
          if (c === ')' || c === '>') depth--;
        }
        if (depth <= 0) {
          propsEndIndex = j;
          break;
        }
      }
      break;
    }
  }

  // script 中 imports 和 body 的分离
  const allImportLines = [];
  const allBodyLines = [];
  let inImportBlock = false;
  for (let i = 0; i < scriptLines.length; i++) {
    const line = scriptLines[i];
    if (line.startsWith('import ')) {
      inImportBlock = true;
      allImportLines.push(line);
      if (line.includes(' from ')) inImportBlock = false;
      continue;
    }
    if (inImportBlock) {
      allImportLines.push(line);
      if (line.includes(' from ')) inImportBlock = false;
      continue;
    }
    if (i > propsEndIndex && propsEndIndex >= 0) {
      allBodyLines.push(line);
    }
  }

  // 清理 imports：调整相对路径，子组件比原文件深了 2 层目录
  const cleanedImports = allImportLines
    .join('\n')
    .replace(/from\s+["'](\.\.?\/[^\s"']+)["']/g, (match, importPath) => {
      if (importPath.includes('PlaygroundDemoSection.vue')) {
        return 'from "../../PlaygroundDemoSection.vue"';
      }
      if (importPath.startsWith('../../../')) {
        return `from "${importPath.replace('../../../', '../../../../../')}"`;
      }
      if (importPath.startsWith('../../')) {
        return `from "${importPath.replace('../../', '../../../../')}"`;
      }
      if (importPath.startsWith('../')) {
        return `from "${importPath.replace('../', '../../../')}"`;
      }
      return match;
    });

  // 3. 解析 template 中的 sections
  const sections = [];
  let currentSection = null;

  for (let i = 0; i < templateContent.length; i++) {
    const line = templateContent[i];
    const ifMatch = line.match(/v-if="activeComponentKey\s*===\s*'([^']+)'"/);
    const elseIfMatch = line.match(/v-else-if="activeComponentKey\s*===\s*'([^']+)'"/);

    if (ifMatch || elseIfMatch) {
      if (currentSection) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }
      const key = (ifMatch || elseIfMatch)[1];
      // 移除 v-if / v-else-if 属性, 只保留 class
      let cleanLine = line
        .replace(/\s*v-if="activeComponentKey\s*===\s*'[^']+'"/, '')
        .replace(/\s*v-else-if="activeComponentKey\s*===\s*'[^']+'"/, '');
      currentSection = {
        key,
        startLine: i,
        firstLine: cleanLine,
        endLine: -1,
      };
    }
  }
  if (currentSection) {
    // 找到最后一个 section 的结束
    currentSection.endLine = templateContent.length - 1;
    sections.push(currentSection);
  }

  console.log(`\n${fileName}: Found ${sections.length} sections: ${sections.map(s => s.key).join(', ')}`);

  // 4. 确定 prefix（从文件名推断）
  const prefixMatch = fileName.match(/Playground(\w+)Demos\.vue/);
  const prefix = prefixMatch ? prefixMatch[1] : 'Unknown';

  // 5. 创建子目录
  const subDir = path.join(COMPONENTS_DIR, subDirName);
  const subComponentsDir = path.join(subDir, 'components');
  fs.mkdirSync(subComponentsDir, { recursive: true });

  // 6. 为每个 section 生成子组件
  const componentNames = [];

  for (const section of sections) {
    const componentName = keyToComponentName(prefix, section.key);
    componentNames.push({ key: section.key, name: componentName });

    // 提取模板内容
    const sectionLines = templateContent.slice(section.startLine, section.endLine + 1);
    // 用清理后的第一行替换原始第一行
    sectionLines[0] = section.firstLine;

    // 生成子组件内容
    const subComponent = [
      '<script setup lang="ts">',
      '// @ts-nocheck',
      cleanedImports,
      '',
      ...allBodyLines,
      '</script>',
      '',
      '<template>',
      ...sectionLines,
      '</template>',
      '',
      styleContent,
      '',
    ].join('\n');

    const subComponentPath = path.join(subComponentsDir, `${componentName}.vue`);
    fs.writeFileSync(subComponentPath, subComponent, 'utf-8');
    console.log(`  Created: ${componentName}.vue`);
  }

  // 7. 生成 dispatcher (新的 PlaygroundXxxDemos.vue)
  const dispatcherImports = componentNames
    .map(c => `import ${c.name} from "./components/${c.name}.vue";`)
    .join('\n');

  const dispatcherConditions = componentNames
    .map((c, i) => {
      const directive = i === 0 ? 'v-if' : 'v-else-if';
      return `    <${c.name} ${directive}="activeComponentKey === '${c.key}'" />`;
    })
    .join('\n');

  const dispatcher = `<script setup lang="ts">
${dispatcherImports}

defineProps<{
  activeComponentKey: string;
}>();
</script>

<template>
  <div>
${dispatcherConditions}
  </div>
</template>
`;

  // 移动原文件到子目录
  const newFilePath = path.join(subDir, fileName);
  fs.writeFileSync(newFilePath, dispatcher, 'utf-8');
  console.log(`  Created dispatcher: ${subDirName}/${fileName}`);

  // 删除原文件
  fs.unlinkSync(filePath);
  console.log(`  Removed original: ${fileName}`);
}

// 处理所有文件
for (const fileName of Object.keys(FILE_MAP)) {
  const filePath = path.join(COMPONENTS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    try {
      processFile(fileName);
    } catch (err) {
      console.error(`Error processing ${fileName}:`, err.message);
    }
  } else {
    console.log(`Skipping ${fileName} (not found)`);
  }
}

console.log('\nDone! Now update PlaygroundPage.vue imports.');
