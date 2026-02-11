import { parse } from 'vue-docgen-api';
import path from 'path';
import fs from 'fs/promises';

export async function generateComponentDocs(filePath) {
  try {
    const componentInfo = await parse(filePath);
    const dir = path.dirname(filePath);
    const name = componentInfo.displayName || path.basename(filePath);

    let markdown = `# 组件: ${name}\n\n`;
    
    if (componentInfo.description) {
      markdown += `## 描述\n${componentInfo.description}\n\n`;
    }

    // Props
    if (componentInfo.props) {
      markdown += `## Props\n| 属性 | 类型 | 默认值 | 描述 |\n| --- | --- | --- | --- |\n`;
      componentInfo.props.forEach(p => {
        markdown += `| ${p.name} | \`${p.type?.name || 'any'}\` | ${p.defaultValue?.value || '-'} | ${p.description || '-'} |\n`;
      });
      markdown += '\n';
    }

    // Slots
    if (componentInfo.slots) {
      markdown += `## Slots\n| 名称 | 描述 |\n| --- | --- |\n`;
      componentInfo.slots.forEach(s => {
        markdown += `| ${s.name} | ${s.description || '-'} |\n`;
      });
      markdown += '\n';
    }

    markdown += `\n---\n> 🤖 AI 提示: 修改此组件前请阅读上述定义。代码位于 \`index.vue\`。`;

    await fs.writeFile(path.join(dir, 'README.md'), markdown);
    console.log(`  - [UI] 已更新: ${name}`);
  } catch (e) {
    console.error(`  - [UI] 解析失败 ${filePath}:`, e.message);
  }
}
