/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { globby } from 'globby';
import { Project } from 'ts-morph';
import { parse as parseVueComponent } from 'vue-docgen-api';

const INDEX_VERSION = 1;
const DEFAULT_PATTERNS = [
	'app/**/*.ts',
	'app/**/*.vue',
	'!app/**/*.d.ts',
	'!app/**/README.md',
];
const SEARCH_TERM_STOP_WORDS = new Set([
	'Copyright',
	'original',
	'author',
	'authors',
	'Licensed',
	'License',
	'Version',
	'Apache',
	'Unless',
	'required',
	'applicable',
	'agreed',
	'writing',
	'software',
	'distributed',
	'WITHOUT',
	'WARRANTIES',
	'CONDITIONS',
	'KIND',
	'either',
	'express',
	'implied',
	'specific',
	'language',
	'governing',
	'permissions',
	'limitations',
	'template',
	'class',
	'const',
	'function',
	'import',
	'export',
	'from',
	'type',
]);

function normalizePath(filePath) {
	return filePath.split(path.sep).join('/');
}

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function hashContent(content) {
	return crypto.createHash('md5').update(content).digest('hex');
}

function lineRangeFromNode(sourceFile, node) {
	const start = sourceFile.getLineAndColumnAtPos(node.getStart());
	const end = sourceFile.getLineAndColumnAtPos(node.getEnd());
	return {
		startLine: start.line,
		endLine: end.line,
	};
}

function getDocDescription(node) {
	if (!node || !node.getJsDocs) return '';
	const jsDocs = node.getJsDocs();
	if (!jsDocs.length) return '';

	const jsDoc = jsDocs[0];
	let description = jsDoc.getDescription().trim();
	const descriptionTag = jsDoc
		.getTags()
		.find((tag) => tag.getTagName() === 'description');

	if (descriptionTag) {
		const tagText = descriptionTag
			.getText()
			.replace(/^@description\s+/, '')
			.trim();
		if (tagText) description = tagText;
	}

	return description.replace(/^\s*\*\s?/gm, '').trim();
}

function extractImportsFromText(content) {
	const imports = new Set();
	const importRegex =
		/(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
	let match;
	while ((match = importRegex.exec(content))) {
		if (match[1]) imports.add(match[1]);
	}
	return [...imports].sort();
}

function extractSearchTerms(content, limit = 360) {
	const terms = new Set();
	const source = String(content || '');
	const identifierRegex = /[A-Za-z_$][A-Za-z0-9_$]{2,}/g;
	const cjkRegex = /[\u4e00-\u9fff]{2,12}/g;
	let match;

	while ((match = identifierRegex.exec(source)) && terms.size < limit) {
		const value = match[0];
		if (SEARCH_TERM_STOP_WORDS.has(value)) continue;
		terms.add(value);
		const split = value
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.split(/[^A-Za-z0-9_$]+/)
			.filter((item) => item.length >= 3 && !SEARCH_TERM_STOP_WORDS.has(item));
		split.forEach((item) => {
			if (terms.size < limit) terms.add(item);
		});
	}

	while ((match = cjkRegex.exec(source)) && terms.size < limit) {
		terms.add(match[0]);
	}

	return [...terms].join('\n');
}

async function getReadmePath(filePath) {
	const dir = path.dirname(filePath);
	const readme = path.join(dir, 'README.md');
	return (await fileExists(readme)) ? normalizePath(readme) : undefined;
}

function createChunk({
	filePath,
	kind,
	title,
	startLine,
	endLine,
	summary,
	searchText,
}) {
	const lineSuffix = startLine ? `:${startLine}-${endLine}` : '';
	return {
		id: `${normalizePath(filePath)}#${title}${lineSuffix}`,
		file: normalizePath(filePath),
		kind,
		title,
		startLine,
		endLine,
		summary: summary || '',
		searchText: searchText || '',
	};
}

async function indexTsFile(indexPath, absolutePath) {
	const content = await fs.readFile(absolutePath, 'utf-8');
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
	});
	const sourceFile = project.addSourceFileAtPath(absolutePath);
	const symbols = [];
	const chunks = [];

	function addSymbol(node, name, kind, signature) {
		if (!name) return;
		const range = lineRangeFromNode(sourceFile, node);
		const summary = getDocDescription(node);
		const symbol = {
			id: `${normalizePath(indexPath)}#${name}:${range.startLine}-${range.endLine}`,
			name,
			kind,
			startLine: range.startLine,
			endLine: range.endLine,
			signature: signature || '',
			summary,
		};
		symbols.push(symbol);
		chunks.push(
			createChunk({
				filePath: indexPath,
				kind,
				title: name,
				startLine: range.startLine,
				endLine: range.endLine,
				summary,
				searchText: [name, kind, signature, summary].filter(Boolean).join('\n'),
			}),
		);
	}

	sourceFile.getClasses().forEach((node) => {
		addSymbol(node, node.getName(), 'class', `class ${node.getName()}`);
		node.getMethods().forEach((method) => {
			const methodName = method.getName();
			addSymbol(
				method,
				`${node.getName() || 'AnonymousClass'}.${methodName}`,
				'method',
				method.getSignature().getDeclaration().getText().split('\n')[0],
			);
		});
	});

	sourceFile.getFunctions().forEach((node) => {
		if (node.isExported() || sourceFile.getClasses().length === 0) {
			addSymbol(
				node,
				node.getName() || 'anonymous',
				'function',
				node.getSignature().getDeclaration().getText().split('\n')[0],
			);
		}
	});

	sourceFile
		.getInterfaces()
		.filter((node) => node.isExported())
		.forEach((node) => {
			addSymbol(
				node,
				node.getName(),
				'interface',
				`interface ${node.getName()}`,
			);
		});

	sourceFile
		.getVariableStatements()
		.filter((node) => node.isExported())
		.forEach((statement) => {
			statement.getDeclarations().forEach((decl) => {
				addSymbol(
					statement,
					decl.getName(),
					'variable',
					statement.getText().split('\n')[0],
				);
			});
		});

	const explicitExports = new Set();
	sourceFile
		.getExportDeclarations()
		.forEach((declaration) =>
			declaration
				.getNamedExports()
				.forEach((specifier) => explicitExports.add(specifier.getName())),
		);
	sourceFile
		.getExportAssignments()
		.forEach(() => explicitExports.add('default'));

	const exports = [
		...explicitExports,
		...symbols
			.filter((symbol) =>
				['class', 'interface', 'function', 'variable'].includes(symbol.kind),
			)
			.map((symbol) => symbol.name),
	];

	const fileChunk = createChunk({
		filePath: indexPath,
		kind: 'file',
		title: normalizePath(indexPath),
		startLine: 1,
		endLine: content.split(/\r?\n/).length,
		summary:
			getDocDescription(sourceFile.getStatements()[0]) ||
			`${normalizePath(indexPath)} 文件级索引`,
		searchText: symbols
			.map((symbol) => `${symbol.kind} ${symbol.name}: ${symbol.summary}`)
			.concat(extractSearchTerms(content))
			.join('\n'),
	});

	project.removeSourceFile(sourceFile);

	return {
		file: {
			path: normalizePath(indexPath),
			kind: 'ts',
			hash: hashContent(content),
			readmePath: await getReadmePath(indexPath),
			imports: extractImportsFromText(content),
			exports: [...new Set(exports)].sort(),
			symbols,
		},
		chunks: [fileChunk, ...chunks],
	};
}

function extractVueDescription(content) {
	const match = content.match(/\/\*\*[\s\S]*?@description\s+([\s\S]*?)\*\//);
	if (!match?.[1]) return '';
	return match[1].replace(/^\s*\*\s?/gm, '').trim();
}

function extractVueScript(content) {
	const match = content.match(/<script(?:\s+setup)?[^>]*>([\s\S]*?)<\/script>/);
	return match?.[1] || '';
}

async function indexVueFile(indexPath, absolutePath) {
	const content = await fs.readFile(absolutePath, 'utf-8');
	let componentInfo = null;
	try {
		componentInfo = await parseVueComponent(absolutePath);
	} catch {
		componentInfo = null;
	}

	const name =
		componentInfo?.displayName ||
		(path.basename(indexPath) === 'index.vue'
			? path.basename(path.dirname(indexPath))
			: path.basename(indexPath, '.vue'));
	const description =
		componentInfo?.description || extractVueDescription(content) || '';
	const props =
		componentInfo?.props?.map((prop) => ({
			name: prop.name,
			type: prop.type?.name || 'unknown',
			description: prop.description || '',
		})) || [];
	const slots =
		componentInfo?.slots?.map((slot) => ({
			name: slot.name,
			description: slot.description || '',
		})) || [];
	const events =
		componentInfo?.events?.map((event) => ({
			name: event.name,
			description: event.description || '',
		})) || [];

	const lines = content.split(/\r?\n/);
	const script = extractVueScript(content);
	const symbols = [
		{
			id: `${normalizePath(indexPath)}#${name}:1-${lines.length}`,
			name,
			kind: 'component',
			startLine: 1,
			endLine: lines.length,
			signature: `<${name}>`,
			summary: description,
			props,
			slots,
			events,
		},
	];

	const searchText = [
		description,
		props.length
			? `Props: ${props.map((prop) => `${prop.name}:${prop.type}`).join(', ')}`
			: '',
		slots.length ? `Slots: ${slots.map((slot) => slot.name).join(', ')}` : '',
		events.length
			? `Events: ${events.map((event) => event.name).join(', ')}`
			: '',
		extractImportsFromText(script).join('\n'),
		extractSearchTerms(content),
	]
		.filter(Boolean)
		.join('\n');

	return {
		file: {
			path: normalizePath(indexPath),
			kind: 'vue',
			hash: hashContent(content),
			readmePath: await getReadmePath(indexPath),
			imports: extractImportsFromText(script),
			exports: [name],
			symbols,
		},
		chunks: [
			createChunk({
				filePath: indexPath,
				kind: 'component',
				title: name,
				startLine: 1,
				endLine: lines.length,
				summary: description,
				searchText,
			}),
		],
	};
}

export async function buildCodebaseIndex({
	rootDir = process.cwd(),
	outputPath = '.scripts/codebase-index.json',
	patterns = DEFAULT_PATTERNS,
} = {}) {
	const files = await globby(patterns, {
		cwd: rootDir,
		absolute: false,
		gitignore: true,
	});

	const indexedFiles = [];
	const chunks = [];

	for (const relativeFile of files.sort()) {
		const indexPath = normalizePath(relativeFile);
		const absolutePath = path.join(rootDir, relativeFile);
		try {
			const result = relativeFile.endsWith('.vue')
				? await indexVueFile(indexPath, absolutePath)
				: await indexTsFile(indexPath, absolutePath);
			indexedFiles.push(result.file);
			chunks.push(...result.chunks);
		} catch (error) {
			console.error(`  - [Index] 解析失败 ${relativeFile}:`, error.message);
		}
	}

	const index = {
		version: INDEX_VERSION,
		generatedAt: new Date().toISOString(),
		root: rootDir,
		stats: {
			files: indexedFiles.length,
			chunks: chunks.length,
		},
		files: indexedFiles,
		chunks,
	};

	const resolvedOutputPath = path.isAbsolute(outputPath)
		? outputPath
		: path.join(rootDir, outputPath);
	await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
	await fs.writeFile(resolvedOutputPath, JSON.stringify(index));

	return index;
}
