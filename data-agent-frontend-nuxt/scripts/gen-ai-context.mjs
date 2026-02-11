import { globby } from 'globby';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { generateComponentDocs } from './utils/ui-engine.mjs';
import { generateLogicDocs } from './utils/logic-engine.mjs';

const CACHE_FILE = '.scripts/ai-gen-cache.json';

/**
 * @description 获取文件的 MD5 哈希值
 */
async function getFileHash(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (e) {
    return null;
  }
}

/**
 * @description 加载缓存
 */
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

/**
 * @description 保存缓存
 */
async function saveCache(cache) {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('保存缓存失败:', e.message);
  }
}

async function generateGlobalIndex(folders) {
  console.log('  - 正在检查全局索引...');
  for (const folder of folders) {
    try {
      await fs.access(folder);
      const subDirs = await fs.readdir(folder, { withFileTypes: true });
      const modules = subDirs
        .filter(d => d.isDirectory())
        .map(d => `- [${d.name}](./${d.name}/README.md)`)
        .join('\n');
      
      const files = subDirs
        .filter(d => d.isFile() && (d.name.endsWith('.vue') || d.name.endsWith('.ts')))
        .map(d => `- ${d.name}`)
        .join('\n');

      let content = `# ${folder.toUpperCase()} 索引\n\n> 🤖 自动生成，请勿手动修改。此文件为 AI 提供模块地图。\n\n`;
      if (modules) content += `## 模块列表\n\n${modules}\n\n`;
      if (files) content += `## 文件列表\n\n${files}\n\n`;

      await fs.writeFile(path.join(folder, 'README.md'), content);
    } catch (e) {}
  }
}

(async () => {
  console.log('🤖 正在构建 AI 上下文索引 (增量模式)...');
  const cache = await loadCache();
  const newCache = {};
  let updatedCount = 0;

  try {
    // 1. 处理 UI 组件
    const uiFiles = await globby([
      'app/components/**/*.vue',
      'app/layouts/**/*.vue',
      'app/pages/**/*.vue'
    ]);
    
    for (const file of uiFiles) {
      const hash = await getFileHash(file);
      newCache[file] = hash;
      if (cache[file] !== hash) {
        await generateComponentDocs(file);
        updatedCount++;
      }
    }

    // 2. 处理逻辑
    const logicFiles = await globby([
      'app/composables/**/*.ts',
      'app/services/**/*.ts',
      'app/stores/**/*.ts',
      'app/utils/**/*.ts',
      '!**/*.d.ts'
    ]);
    
    for (const file of logicFiles) {
      const hash = await getFileHash(file);
      newCache[file] = hash;
      if (cache[file] !== hash) {
        await generateLogicDocs(file);
        updatedCount++;
      }
    }

    // 3. 更新索引
    await generateGlobalIndex([
      'app/components', 'app/composables', 'app/services', 
      'app/stores', 'app/utils', 'app/pages', 'app/layouts'
    ]);

    await saveCache(newCache);
    
    if (updatedCount > 0) {
      console.log(`✅ AI 上下文同步完成 (更新了 ${updatedCount} 个文件)`);
    } else {
      console.log('✨ 所有文档已是最新，无需更新');
    }
  } catch (error) {
    console.error('❌ 同步失败:', error);
    process.exit(1);
  }
})();
