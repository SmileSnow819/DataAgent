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

import fs from 'fs/promises';

const INDEX_FILE = '.scripts/codebase-index.json';
const query = process.argv
	.slice(2)
	.filter((arg) => arg !== '--')
	.join(' ')
	.trim();

function tokenize(text) {
	const source = String(text).toLowerCase();
	const terms = source
		.toLowerCase()
		.split(/[\s,.;:!?()[\]{}'"`/\\|，。；：！？（）【】《》、]+/)
		.map((item) => item.trim())
		.filter((item) => item.length >= 2);
	const cjkRuns = source.match(/[\u4e00-\u9fff]{2,}/g) || [];
	for (const run of cjkRuns) {
		for (let i = 0; i < run.length - 1; i++) {
			terms.push(run.slice(i, i + 2));
		}
	}
	return [...new Set(terms)];
}

function scoreChunk(chunk, terms) {
	const title = `${chunk.title || ''}`.toLowerCase();
	const summary = `${chunk.summary || ''}`.toLowerCase();
	const file = `${chunk.file || ''}`.toLowerCase();
	const searchText = `${chunk.searchText || ''}`.toLowerCase();

	let score = 0;
	for (const term of terms) {
		if (title.includes(term)) score += 8;
		if (file.includes(term)) score += 5;
		if (summary.includes(term)) score += 4;
		const textHits = searchText.split(term).length - 1;
		score += Math.min(textHits, 8);
	}
	return score;
}

function formatLocation(chunk) {
	if (!chunk.startLine) return chunk.file;
	return `${chunk.file}:${chunk.startLine}`;
}

async function main() {
	if (!query) {
		console.error('用法: pnpm ctx:search -- "聊天流式输出在哪里处理"');
		process.exit(1);
	}

	let index;
	try {
		index = JSON.parse(await fs.readFile(INDEX_FILE, 'utf-8'));
	} catch {
		console.error(`未找到 ${INDEX_FILE}，请先运行 pnpm gen:ctx`);
		process.exit(1);
	}

	const terms = tokenize(query);
	if (!terms.length) {
		console.error('查询词过短，请输入更具体的问题。');
		process.exit(1);
	}

	const results = index.chunks
		.map((chunk) => ({
			chunk,
			score: scoreChunk(chunk, terms),
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);

	console.log(`查询: ${query}`);
	console.log(`索引: ${index.stats.files} files, ${index.stats.chunks} chunks`);
	console.log('');

	if (!results.length) {
		console.log('没有找到匹配结果。');
		return;
	}

	results.forEach(({ chunk, score }, index) => {
		console.log(`${index + 1}. [score=${score}] ${chunk.title}`);
		console.log(`   ${formatLocation(chunk)} (${chunk.kind})`);
		if (chunk.summary) console.log(`   ${chunk.summary}`);
		console.log('');
	});
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
