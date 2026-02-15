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
		console.log(e);
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
		console.log(e);
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

/**
 * @description 递归生成目录索引
 */
async function generateRecursiveIndex(dirPath, isPages = false) {
	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });

		const subDirs = entries.filter(
			(e) => e.isDirectory() && !e.name.startsWith('.'),
		);
		const files = entries.filter(
			(e) =>
				e.isFile() &&
				(e.name.endsWith('.vue') || e.name.endsWith('.ts')) &&
				e.name !== 'README.md',
		);

		// 递归处理子目录
		for (const subDir of subDirs) {
			await generateRecursiveIndex(path.join(dirPath, subDir.name), isPages);
		}

		// 如果不是 pages 目录，且包含 index.vue 或 index.ts，则说明该目录已有详细文档，跳过生成索引
		const hasIndexFile = files.some(
			(f) => f.name === 'index.vue' || f.name === 'index.ts',
		);
		if (!isPages && hasIndexFile) return;

		// 如果既没有子目录也没有相关文件，不生成 README
		if (subDirs.length === 0 && files.length === 0) return;

		// 生成当前目录的 README
		let markdown = `# 目录索引: ${path.basename(dirPath)}\n\n> 🤖 自动生成，请勿手动修改。此文件为 AI 提供模块地图。\n\n`;

		if (subDirs.length > 0) {
			markdown += `## 子目录\n\n`;
			for (const subDir of subDirs) {
				const subREADME = path.join(dirPath, subDir.name, 'README.md');
				try {
					await fs.access(subREADME);
					markdown += `- [${subDir.name}](./${subDir.name}/README.md)\n`;
				} catch {
					markdown += `- ${subDir.name}\n`;
				}
			}
			markdown += '\n';
		}

		if (files.length > 0) {
			markdown += `## 文件\n\n`;
			for (const file of files) {
				markdown += `- ${file.name}\n`;
			}
			markdown += '\n';
		}

		await fs.writeFile(path.join(dirPath, 'README.md'), markdown);
	} catch (e) {
		console.log(e);
		// 忽略错误
	}
}

(async () => {
	console.log('🤖 正在构建 AI 上下文索引 (增量模式)...');
	const cache = await loadCache();
	const newCache = {};
	let updatedCount = 0;

	try {
		// 1. 处理 UI 组件 (排除 pages 的具体文档生成，只保留索引)
		const uiFiles = await globby([
			'app/components/**/*.vue',
			'app/layouts/**/*.vue',
			'!app/pages/**/*.vue',
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
			'!**/*.d.ts',
		]);

		for (const file of logicFiles) {
			const hash = await getFileHash(file);
			newCache[file] = hash;
			if (cache[file] !== hash) {
				await generateLogicDocs(file);
				updatedCount++;
			}
		}

		// 3. 递归生成所有相关目录的索引
		console.log('  - 正在生成目录索引...');
		const roots = [
			{ path: 'app/components', isPages: false },
			{ path: 'app/composables', isPages: false },
			{ path: 'app/services', isPages: false },
			{ path: 'app/stores', isPages: false },
			{ path: 'app/utils', isPages: false },
			{ path: 'app/pages', isPages: true },
			{ path: 'app/layouts', isPages: false },
		];

		for (const root of roots) {
			await generateRecursiveIndex(root.path, root.isPages);
		}

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
