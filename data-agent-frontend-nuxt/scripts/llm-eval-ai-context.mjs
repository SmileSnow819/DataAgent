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

import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { globby } from 'globby';

const execFileAsync = promisify(execFile);

const INDEX_FILE = '.scripts/codebase-index.json';
const REPORT_DIR = '.scripts/context-llm-eval-reports';
const DEFAULT_TOP_K = 5;
const DEFAULT_MAX_GREP_ROUNDS = 3;
const DEFAULT_QUERIES_PER_ROUND = 2;
const DEFAULT_RG_MAX_COUNT = 20;
const DEFAULT_RUNS = 1;
const MAX_CONTEXT_CHARS = 12000;

const CASES = [
	{
		id: 'chat-sse',
		question: '聊天流式输出 SSE 在哪里处理，如何按节点更新 Timeline？',
		expectedFiles: ['app/stores/chat.ts', 'app/services/graph/index.ts'],
	},
	{
		id: 'streaming-report',
		question: '流式生成的数据分析报告在哪里渲染成 Markdown 和打字机效果？',
		expectedFiles: [
			'app/components/chat/ChatStreamingReport.vue',
			'app/composables/useTypewriter.ts',
		],
	},
	{
		id: 'echarts-render',
		question: 'ECharts 图表代码块是怎么从 Markdown 转成页面图表的？',
		expectedFiles: [
			'app/utils/markdown/markdown-plugin-echarts.ts',
			'app/composables/useEchartsRenderer.ts',
			'app/components/chat/ChatMarkdownReport.vue',
		],
	},
	{
		id: 'datasource-config',
		question: '数据源配置、测试连接和展开表列表在哪里实现？',
		expectedFiles: [
			'app/pages/system/data-sources/index.vue',
			'app/services/datasource/index.ts',
			'app/pages/system/data-sources/ExpandedTableManager.vue',
		],
	},
	{
		id: 'human-feedback',
		question: '人工反馈 Human Feedback 的开关、确认和恢复执行在哪里？',
		expectedFiles: [
			'app/components/chat/ChatInputArea.vue',
			'app/stores/chat.ts',
			'app/services/graph/index.ts',
		],
	},
	{
		id: 'session-state',
		question: '切换会话时如何保存和恢复流式运行态？',
		expectedFiles: [
			'app/services/sessionStateManager/index.ts',
			'app/stores/chat.ts',
		],
	},
	{
		id: 'chat-sidebar',
		question: '聊天侧边栏的会话列表、切换会话和删除会话在哪里实现？',
		expectedFiles: [
			'app/components/chat/ChatSidebar.vue',
			'app/services/chat/index.ts',
			'app/stores/chat.ts',
		],
	},
	{
		id: 'chat-input',
		question: '聊天输入框、发送按钮、停止生成和附件上传入口在哪里实现？',
		expectedFiles: [
			'app/components/chat/ChatInputArea.vue',
			'app/stores/chat.ts',
			'app/services/fileUpload/index.ts',
		],
	},
	{
		id: 'workflow-timeline',
		question: '聊天工作流 Timeline 的节点分组和展示组件在哪里？',
		expectedFiles: [
			'app/components/chat/ChatWorkflowTimeline.vue',
			'app/utils/workflowTimeline.ts',
			'app/utils/reportTimeline.ts',
		],
	},
	{
		id: 'result-set',
		question: '聊天返回的数据结果集表格在哪里渲染，结果集接口在哪里请求？',
		expectedFiles: [
			'app/components/chat/ChatResultSet.vue',
			'app/services/resultSet/index.ts',
		],
	},
	{
		id: 'agent-list',
		question: '智能体列表页面的查询、新建、删除和跳转编辑在哪里实现？',
		expectedFiles: ['app/pages/agent/index.vue', 'app/services/agent/index.ts'],
	},
	{
		id: 'agent-new',
		question: '新建智能体页面的表单、返回列表和保存逻辑在哪里实现？',
		expectedFiles: ['app/pages/agent/new.vue', 'app/services/agent/index.ts'],
	},
	{
		id: 'agent-detail',
		question: '智能体详情页如何关联数据源、知识库和预设问题？',
		expectedFiles: [
			'app/pages/agent/[id].vue',
			'app/services/agentDatasource/index.ts',
			'app/services/agentKnowledge/index.ts',
			'app/services/presetQuestion/index.ts',
		],
	},
	{
		id: 'model-config',
		question: '模型配置页面和模型配置服务在哪里，如何保存 API Key 和模型信息？',
		expectedFiles: [
			'app/pages/system/model-config.vue',
			'app/services/modelConfig/index.ts',
		],
	},
	{
		id: 'prompt-config',
		question: 'Prompt 配置列表、编辑和保存接口在哪里实现？',
		expectedFiles: [
			'app/pages/prompt-config/index.vue',
			'app/services/prompt/index.ts',
		],
	},
	{
		id: 'business-knowledge',
		question: '业务知识库页面和业务知识服务在哪里实现？',
		expectedFiles: [
			'app/pages/knowledge/business.vue',
			'app/services/businessKnowledge/index.ts',
		],
	},
	{
		id: 'agent-knowledge',
		question: '智能体知识库页面和智能体知识服务在哪里实现？',
		expectedFiles: [
			'app/pages/knowledge/agents.vue',
			'app/services/agentKnowledge/index.ts',
		],
	},
	{
		id: 'semantic-model',
		question: '语义模型页面、语义模型服务和逻辑关系服务在哪里？',
		expectedFiles: [
			'app/pages/knowledge/semantic-models.vue',
			'app/services/semanticModel/index.ts',
			'app/services/logicalRelation/index.ts',
		],
	},
	{
		id: 'crud-helper',
		question: '通用 CRUD 页面组合式函数封装在哪里，如何处理分页、查询和删除？',
		expectedFiles: ['app/composables/useCrudPage/index.ts'],
	},
	{
		id: 'confirm-dialog',
		question: '全局确认弹窗 ConfirmDialog 和 useConfirm 是怎么串起来的？',
		expectedFiles: [
			'app/components/common/ConfirmDialog/index.vue',
			'app/composables/useConfirm/index.ts',
		],
	},
	{
		id: 'tip-plugin',
		question: '全局 Tip 提示组件、store 和插件入口在哪里？',
		expectedFiles: [
			'app/components/common/Tip/index.vue',
			'app/stores/tips/index.ts',
			'app/plugins/tipPlugin.ts',
		],
	},
	{
		id: 'datasource-selection',
		question: '数据源表选择、过滤和选中状态工具函数在哪里？',
		expectedFiles: ['app/utils/datasourceSelection.ts'],
	},
	{
		id: 'table-search',
		question: '表列表搜索和过滤逻辑在哪里封装？',
		expectedFiles: ['app/utils/tableSearch.ts'],
	},
	{
		id: 'report-template',
		question: '数据分析报告导出的 HTML 模板在哪里生成？',
		expectedFiles: ['app/utils/report-html-template.ts'],
	},
	{
		id: 'markdown-highlight',
		question: 'Markdown 代码高亮插件在哪里，如何接入 Markdown 渲染？',
		expectedFiles: [
			'app/utils/markdown/markdown-plugin-highlight.ts',
			'app/utils/markdown/index.ts',
		],
	},
	{
		id: 'datasource-form',
		question: '数据源新增编辑表单弹窗和外键配置弹窗在哪里？',
		expectedFiles: [
			'app/pages/system/data-sources/DatasourceFormDialog.vue',
			'app/pages/system/data-sources/ForeignKeyDialog.vue',
		],
	},
];

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

async function loadDotenv(filePath = '.env') {
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		for (const line of content.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
			if (!match) continue;
			const key = match[1];
			let value = match[2].trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (process.env[key] === undefined) process.env[key] = value;
		}
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}
}

function positiveNumber(value, fallback) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : fallback;
}

function createRandom(seed = `${Date.now()}`) {
	let state = 0;
	for (const char of String(seed)) {
		state = (state * 31 + char.charCodeAt(0)) >>> 0;
	}
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

function sampleCases(cases, limit, random) {
	const pool = [...cases];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, Math.min(limit, pool.length));
}

function getConfig() {
	const apiKey =
		process.env.LLM_EVAL_API_KEY ||
		process.env.DEEPSEEK_API_KEY ||
		process.env.OPENAI_API_KEY;
	const baseUrl =
		process.env.LLM_EVAL_BASE_URL ||
		process.env.DEEPSEEK_BASE_URL ||
		process.env.OPENAI_BASE_URL ||
		'https://api.deepseek.com';
	const model =
		process.env.LLM_EVAL_MODEL ||
		process.env.DEEPSEEK_MODEL ||
		process.env.OPENAI_MODEL ||
		'deepseek-chat';

	if (!apiKey) {
		throw new Error(
			'缺少 API Key。请在 .env 中配置 DEEPSEEK_API_KEY=你的 key，或配置 LLM_EVAL_API_KEY。',
		);
	}

	return {
		apiKey,
		baseUrl,
		model,
		topK: positiveNumber(process.env.LLM_EVAL_TOP_K, DEFAULT_TOP_K),
		caseLimit: positiveNumber(process.env.LLM_EVAL_CASE_LIMIT, CASES.length),
		runs: positiveNumber(process.env.LLM_EVAL_RUNS, DEFAULT_RUNS),
		randomSeed: process.env.LLM_EVAL_RANDOM_SEED || `${Date.now()}`,
		maxOutputTokens: positiveNumber(process.env.LLM_EVAL_MAX_OUTPUT_TOKENS, 700),
		maxGrepRounds: positiveNumber(
			process.env.LLM_EVAL_MAX_GREP_ROUNDS,
			DEFAULT_MAX_GREP_ROUNDS,
		),
		queriesPerRound: positiveNumber(
			process.env.LLM_EVAL_QUERIES_PER_ROUND,
			DEFAULT_QUERIES_PER_ROUND,
		),
		rgMaxCount: positiveNumber(
			process.env.LLM_EVAL_RG_MAX_COUNT,
			DEFAULT_RG_MAX_COUNT,
		),
	};
}

function chatCompletionsUrl(baseUrl) {
	const normalized = baseUrl.replace(/\/$/, '');
	if (normalized.endsWith('/chat/completions')) return normalized;
	return `${normalized}/chat/completions`;
}

function tokenize(text) {
	const source = String(text).toLowerCase();
	const terms = source
		.split(/[\s,.;:!?()[\]{}'"`/\\|，。；：！？（）【】《》、]+/)
		.map((item) => item.trim())
		.filter((item) => item.length >= 2);
	const cjkRuns = source.match(/[\u4e00-\u9fff]{2,}/g) || [];
	for (const run of cjkRuns) {
		for (let i = 0; i < run.length - 1; i++) terms.push(run.slice(i, i + 2));
	}
	return [...new Set(terms)];
}

function scoreText(fields, terms) {
	let score = 0;
	for (const term of terms) {
		fields.forEach((field, index) => {
			const normalized = String(field || '').toLowerCase();
			const hits = normalized.split(term).length - 1;
			if (hits <= 0) return;
			const weight = index === 0 ? 8 : index === 1 ? 5 : index === 2 ? 4 : 1;
			score += Math.min(hits, 8) * weight;
		});
	}
	return score;
}

async function loadCodebaseCorpus() {
	const index = JSON.parse(await fs.readFile(INDEX_FILE, 'utf-8'));
	return index.chunks.map((chunk) => ({
		file: chunk.file,
		sourceFile: chunk.file,
		kind: chunk.kind,
		title: chunk.title,
		summary: chunk.summary,
		startLine: chunk.startLine,
		endLine: chunk.endLine,
		searchText: [chunk.searchText, chunk.summary, chunk.title].join('\n'),
	}));
}

function searchCorpus(corpus, question, topK) {
	const terms = tokenize(question);
	return corpus
		.map((item) => ({
			...item,
			score: scoreText(
				[item.title, item.file, item.summary, item.searchText],
				terms,
			),
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, topK);
}

function formatSearchSeed(results) {
	if (!results.length) return 'codebase search 没有召回结果。';
	return results
		.map((item, index) => {
			const lines = item.startLine
				? `:${item.startLine}-${item.endLine || item.startLine}`
				: '';
			return [
				`${index + 1}. [score=${item.score}] ${item.title}`,
				`file: ${item.file}${lines}`,
				`kind: ${item.kind}`,
				item.summary ? `summary: ${item.summary}` : '',
			]
				.filter(Boolean)
				.join('\n');
		})
		.join('\n\n');
}

function truncate(value, limit = MAX_CONTEXT_CHARS) {
	const text = String(value || '');
	if (text.length <= limit) return text;
	return `${text.slice(0, limit)}\n... [truncated ${text.length - limit} chars]`;
}

function parseModelJson(content) {
	const raw = String(content || '').trim();
	const unfenced = raw
		.replace(/^```json\s*/i, '')
		.replace(/^```\s*/i, '')
		.replace(/```$/i, '')
		.trim();
	try {
		return JSON.parse(unfenced);
	} catch {
		const match = unfenced.match(/\{[\s\S]*\}/);
		if (!match) return null;
		try {
			return JSON.parse(match[0]);
		} catch {
			return null;
		}
	}
}

async function callModel({ config, messages }) {
	const response = await fetch(chatCompletionsUrl(config.baseUrl), {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: config.model,
			messages,
			temperature: 0,
			max_tokens: config.maxOutputTokens,
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`LLM 请求失败 ${response.status}: ${text.slice(0, 500)}`);
	}

	const data = await response.json();
	return {
		content: data.choices?.[0]?.message?.content || '',
		usage: data.usage || {},
	};
}

function sumUsage(results, key) {
	return results.reduce((sum, item) => sum + Number(item[key] || 0), 0);
}

function usageOfRun(run) {
	return {
		prompt: sumUsage(run.usages, 'prompt_tokens'),
		completion: sumUsage(run.usages, 'completion_tokens'),
		total: sumUsage(run.usages, 'total_tokens'),
	};
}

function expectedHitThreshold(testCase) {
	if (testCase.requiredHits) return testCase.requiredHits;
	return Math.min(2, testCase.expectedFiles.length);
}

function expectedMatches(text, expectedFiles) {
	const source = String(text || '');
	return expectedFiles.filter((file) => source.includes(file));
}

function hasEnoughExpectedMatches(text, testCase) {
	return (
		expectedMatches(text, testCase.expectedFiles).length >=
		expectedHitThreshold(testCase)
	);
}

function evaluateAnswer(content, parsed, testCase) {
	const files = Array.isArray(parsed?.files)
		? parsed.files.map((item) => String(item))
		: [];
	const combined = `${content}\n${files.join('\n')}`;
	const matchedFiles = expectedMatches(combined, testCase.expectedFiles);
	return {
		files,
		matchedFiles,
		requiredHits: expectedHitThreshold(testCase),
		expectedHit: matchedFiles.length >= expectedHitThreshold(testCase),
	};
}

function formatTimestamp(date) {
	const parts = new Intl.DateTimeFormat('zh-CN', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(date);
	const get = (type) => parts.find((item) => item.type === type)?.value || '00';
	return `${get('year')}-${get('month')}-${get('day')}-${get('hour')}:${get('minute')}`;
}

async function exists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function uniqueReportPath(basePath) {
	if (!(await exists(basePath))) return basePath;
	const ext = path.extname(basePath);
	const stem = basePath.slice(0, -ext.length);
	for (let i = 1; i < 100; i++) {
		const candidate = `${stem}-${String(i).padStart(2, '0')}${ext}`;
		if (!(await exists(candidate))) return candidate;
	}
	return `${stem}-${Date.now()}${ext}`;
}

function safeQueries(parsed, limit) {
	if (!Array.isArray(parsed?.queries)) return [];
	return parsed.queries
		.map((item) => String(item || '').trim())
		.filter(Boolean)
		.filter((item) => item.length <= 80)
		.slice(0, limit);
}

async function runRg(query, config) {
	try {
		const { stdout, stderr } = await execFileAsync(
			'rg',
			[
				'--line-number',
				'--column',
				'--smart-case',
				'--glob',
				'app/**',
				'--glob',
				'scripts/**',
				'--glob',
				'!**/node_modules/**',
				'--max-count',
				String(config.rgMaxCount),
				query,
				'.',
			],
			{ maxBuffer: 1024 * 1024 },
		);
		return truncate(stdout || stderr || '(no output)', MAX_CONTEXT_CHARS / 2);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return runJsGrep(query, config);
		}
		const output = `${error.stdout || ''}${error.stderr || ''}`.trim();
		if (error.code === 1) {
			return output ? truncate(output, MAX_CONTEXT_CHARS / 2) : '(no matches)';
		}
		return output
			? truncate(`[rg error ${error.code}]\n${output}`, MAX_CONTEXT_CHARS / 2)
			: `[rg error ${error.code || 'unknown'}]`;
	}
}

async function runJsGrep(query, config) {
	const normalizedQuery = String(query || '').toLowerCase();
	if (!normalizedQuery) return '(no matches)';
	const files = await globby(['app/**/*.{ts,vue}', 'scripts/**/*.mjs'], {
		gitignore: true,
	});
	const matches = [];
	const maxMatches = Math.max(config.rgMaxCount, 1);

	for (const file of files.sort()) {
		const normalizedFile = file.toLowerCase();
		if (normalizedFile.includes(normalizedQuery)) {
			matches.push(`${file}:1:1:[path match]`);
			if (matches.length >= maxMatches) break;
		}

		let content = '';
		try {
			content = await fs.readFile(file, 'utf-8');
		} catch {
			continue;
		}

		const lines = content.split(/\r?\n/);
		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];
			const column = line.toLowerCase().indexOf(normalizedQuery);
			if (column === -1) continue;
			matches.push(`${file}:${index + 1}:${column + 1}:${line}`);
			if (matches.length >= maxMatches) break;
		}
		if (matches.length >= maxMatches) break;
	}

	return matches.length
		? truncate(`[js-grep fallback]\n${matches.join('\n')}`, MAX_CONTEXT_CHARS / 2)
		: '[js-grep fallback]\n(no matches)';
}

function buildPlannerMessages({
	testCase,
	mode,
	observations,
	searchSeed,
	queriesPerRound,
}) {
	const modeText =
		mode === 'grep-search'
			? '你可以先参考 codebase search 召回结果，再决定下一轮 grep 关键词。'
			: '你没有索引召回结果，只能自己决定下一轮 grep 关键词。';
	return [
		{
			role: 'system',
			content:
				'你是一个代码库定位助手。你只能通过 grep 观察结果定位文件。必须输出合法 JSON，不要 Markdown。',
		},
		{
			role: 'user',
			content: [
				`问题：${testCase.question}`,
				`期望找到的功能文件未知，请根据观察定位最可能文件。${modeText}`,
				'输出 JSON 结构：{"queries":["关键词1","关键词2"],"reason":"为什么查这些词"}',
				`每轮最多输出 ${queriesPerRound} 个短关键词，优先查函数名、组件名、业务英文词、中文界面词。`,
				searchSeed ? `codebase search 召回：\n${searchSeed}` : '',
				observations.length
					? `已有 grep 观察：\n${truncate(observations.join('\n\n'))}`
					: '已有 grep 观察：暂无',
			]
				.filter(Boolean)
				.join('\n\n'),
		},
	];
}

function buildFinalMessages({ testCase, mode, observations, searchSeed }) {
	const modeText =
		mode === 'grep-search'
			? '本轮使用了 codebase search + grep。'
			: '本轮只使用了 grep。';
	return [
		{
			role: 'system',
			content:
				'你是代码库问答评测助手。必须输出合法 JSON，files 字段必须是字符串数组。',
		},
		{
			role: 'user',
			content: [
				modeText,
				`问题：${testCase.question}`,
				'请基于已有工具观察回答，指出最相关文件。',
				'输出 JSON 结构：{"answer":"简洁回答","files":["app/..."],"confidence":0.0}',
				searchSeed ? `codebase search 召回：\n${searchSeed}` : '',
				observations.length
					? `grep 观察：\n${truncate(observations.join('\n\n'))}`
					: 'grep 观察：暂无',
			]
				.filter(Boolean)
				.join('\n\n'),
		},
	];
}

async function runToolLoop({ testCase, mode, config, codebaseResults = [] }) {
	const searchSeed = mode === 'grep-search' ? formatSearchSeed(codebaseResults) : '';
	const observations = [];
	const usages = [];
	const rounds = [];
	const seedMatchedFiles = expectedMatches(searchSeed, testCase.expectedFiles);
	const seedHit =
		mode === 'grep-search' &&
		seedMatchedFiles.length >= expectedHitThreshold(testCase);
	let foundRound = seedHit ? 0 : null;
	let toolOutputChars = searchSeed.length;

	if (seedHit) {
		observations.push(
			'Round 0\ncodebase search seed 已经命中期望文件，停止后续 grep。',
		);
	}

	for (
		let round = 1;
		foundRound === null && round <= config.maxGrepRounds;
		round++
	) {
		const planner = await callModel({
			config,
			messages: buildPlannerMessages({
				testCase,
				mode,
				observations,
				searchSeed,
				queriesPerRound: config.queriesPerRound,
			}),
		});
		usages.push(planner.usage);
		const parsed = parseModelJson(planner.content);
		const queries = safeQueries(parsed, config.queriesPerRound);
		const outputs = [];

		for (const query of queries) {
			const output = await runRg(query, config);
			const block = [`$ rg ${query}`, output].join('\n');
			outputs.push(block);
			toolOutputChars += block.length;
		}

		const roundText = outputs.length
			? `Round ${round}\n${outputs.join('\n\n')}`
			: `Round ${round}\n(no valid query from model)`;
		observations.push(roundText);
		if (foundRound === null && hasEnoughExpectedMatches(roundText, testCase)) {
			foundRound = round;
		}
		rounds.push({
			round,
			modelOutput: planner.content,
			queries,
			output: truncate(outputs.join('\n\n')),
			hitAfterRound: foundRound !== null,
		});
	}

	const finalResponse = await callModel({
		config,
		messages: buildFinalMessages({ testCase, mode, observations, searchSeed }),
	});
	usages.push(finalResponse.usage);
	const parsed = parseModelJson(finalResponse.content);
	const evalResult = evaluateAnswer(
		finalResponse.content,
		parsed,
		testCase,
	);

	return {
		mode,
		codebaseResults,
		searchSeed,
		rounds,
		foundRound,
		grepCalls: rounds.reduce((sum, item) => sum + item.queries.length, 0),
		searchCalls: mode === 'grep-search' ? 1 : 0,
		llmCalls: usages.length,
		toolOutputChars,
		usages,
		usage: usageOfRun({ usages }),
		content: finalResponse.content,
		parsed,
		eval: evalResult,
	};
}

function average(values) {
	const valid = values.filter((item) => item !== null && item !== undefined);
	if (!valid.length) return null;
	return valid.reduce((sum, item) => sum + Number(item), 0) / valid.length;
}

function formatAverage(value) {
	return value === null || value === undefined ? 'N/A' : value.toFixed(2);
}

function formatDelta(before, after, lowerIsBetter = true) {
	const delta = Number(after) - Number(before);
	if (!Number.isFinite(delta)) return 'N/A';
	const sign = delta > 0 ? '+' : '';
	const className = lowerIsBetter
		? delta <= 0
			? 'positive'
			: 'negative'
		: delta >= 0
			? 'positive'
			: 'negative';
	return `<span class="${className}">${sign}${delta.toLocaleString()}</span>`;
}

function displayRound(value) {
	if (value === 0) return '0（search 命中）';
	if (value === null || value === undefined) return '未命中';
	return String(value);
}

function renderToolRounds(run, expectedFiles) {
	const seed = run.searchSeed
		? `<details open><summary>codebase search seed</summary><pre>${escapeHtml(run.searchSeed)}</pre></details>`
		: '';
	const rounds = run.rounds
		.map(
			(round) => `<details>
				<summary>Round ${round.round} · grep: ${escapeHtml(round.queries.join(' / ') || '无')} · ${round.hitAfterRound ? '<span class="positive">已找到</span>' : '<span class="muted">未找到</span>'}</summary>
				<pre>${escapeHtml(round.output)}</pre>
				<pre>${escapeHtml(round.modelOutput)}</pre>
			</details>`,
		)
		.join('');
	const answerHit = run.eval.expectedHit
		? '<span class="positive">最终回答命中</span>'
		: '<span class="negative">最终回答未命中</span>';
	return [
		`<p class="muted">首次工具命中轮次：${displayRound(run.foundRound)} · grep ${run.grepCalls} 次 · LLM ${run.llmCalls} 次 · 工具输出 ${run.toolOutputChars.toLocaleString()} chars · 回答命中 ${run.eval.matchedFiles.length}/${run.eval.requiredHits} · ${answerHit}</p>`,
		`<p class="muted">期望文件：${expectedFiles.map(escapeHtml).join(' / ')}</p>`,
		run.eval.matchedFiles.length
			? `<p class="muted">回答命中文件：${run.eval.matchedFiles.map(escapeHtml).join(' / ')}</p>`
			: '',
		seed,
		rounds,
		`<h4>最终回答</h4><pre>${escapeHtml(run.content)}</pre>`,
	].join('\n');
}

function renderHtml({ generatedAt, config, caseResults }) {
	const grepHits = caseResults.filter((item) => item.grep.eval.expectedHit).length;
	const grepSearchHits = caseResults.filter(
		(item) => item.grepSearch.eval.expectedHit,
	).length;
	const grepFound = caseResults.filter((item) => item.grep.foundRound !== null).length;
	const grepSearchFound = caseResults.filter(
		(item) => item.grepSearch.foundRound !== null,
	).length;
	const grepUsages = caseResults.map((item) => item.grep.usage);
	const grepSearchUsages = caseResults.map((item) => item.grepSearch.usage);
	const grepPrompt = sumUsage(grepUsages, 'prompt');
	const grepSearchPrompt = sumUsage(grepSearchUsages, 'prompt');
	const grepCompletion = sumUsage(grepUsages, 'completion');
	const grepSearchCompletion = sumUsage(grepSearchUsages, 'completion');
	const grepTotal = sumUsage(grepUsages, 'total');
	const grepSearchTotal = sumUsage(grepSearchUsages, 'total');
	const grepCalls = sumUsage(caseResults.map((item) => item.grep), 'grepCalls');
	const grepSearchCalls = sumUsage(
		caseResults.map((item) => item.grepSearch),
		'grepCalls',
	);
	const grepToolChars = sumUsage(
		caseResults.map((item) => item.grep),
		'toolOutputChars',
	);
	const grepSearchToolChars = sumUsage(
		caseResults.map((item) => item.grepSearch),
		'toolOutputChars',
	);
	const grepAverageRound = average(caseResults.map((item) => item.grep.foundRound));
	const grepSearchAverageRound = average(
		caseResults.map((item) => item.grepSearch.foundRound),
	);
	const chartData = {
		hits: {
			names: ['LLM + grep', 'LLM + search + grep'],
			answer: [grepHits, grepSearchHits],
			tool: [grepFound, grepSearchFound],
			total: caseResults.length,
		},
		tokens: {
			names: ['Prompt', 'Completion', 'Total'],
			grep: [grepPrompt, grepCompletion, grepTotal],
			grepSearch: [grepSearchPrompt, grepSearchCompletion, grepSearchTotal],
		},
		rounds: {
			names: caseResults.map((item) => item.id),
			grep: caseResults.map((item) => item.grep.foundRound ?? config.maxGrepRounds + 1),
			grepSearch: caseResults.map(
				(item) => item.grepSearch.foundRound ?? config.maxGrepRounds + 1,
			),
		},
		toolChars: {
			names: caseResults.map((item) => item.id),
			grep: caseResults.map((item) => item.grep.toolOutputChars),
			grepSearch: caseResults.map((item) => item.grepSearch.toolOutputChars),
		},
	};

	return `<!doctype html>
<html lang="zh-CN">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>DataAgent LLM Tool Eval</title>
	<style>
		body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f6f8fb; }
		header { padding: 32px 40px; background: linear-gradient(135deg, #fff 0%, #edf7f3 100%); border-bottom: 1px solid #e6ebf2; }
		main { padding: 28px 40px 48px; }
		h1 { margin: 0 0 8px; font-size: 26px; }
		h2 { margin: 30px 0 14px; font-size: 20px; }
		h3 { margin: 0 0 10px; font-size: 15px; }
		h4 { margin: 14px 0 8px; font-size: 13px; }
		.muted { color: #667085; }
		.cards, .chart-grid, .compare-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
		.card, .case-card, .chart-card, .table-card { background: #fff; border: 1px solid #e6ebf2; border-radius: 10px; padding: 18px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04); }
		.kpi { font-size: 28px; font-weight: 800; color: #0f4c81; }
		table { width: 100%; border-collapse: collapse; font-size: 13px; }
		th { text-align: left; background: #f8fafc; color: #475467; }
		th, td { border-bottom: 1px solid #edf1f6; padding: 10px 12px; vertical-align: top; }
		.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 700; background: #eef6ff; color: #175cd3; }
		.positive { color: #047857; font-weight: 700; }
		.negative { color: #b42318; font-weight: 700; }
		.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
		.chart-box { height: 300px; }
		.case-card { margin-bottom: 18px; }
		pre { white-space: pre-wrap; background: #f8fafc; border-radius: 8px; padding: 10px; font-size: 12px; max-height: 300px; overflow: auto; }
		details { border: 1px solid #edf1f6; border-radius: 8px; padding: 10px; margin: 10px 0; background: #fff; }
		summary { cursor: pointer; font-size: 13px; font-weight: 600; }
		@media (max-width: 900px) { header, main { padding-left: 18px; padding-right: 18px; } .cards, .chart-grid, .compare-grid { grid-template-columns: 1fr; } }
	</style>
</head>
<body>
	<header>
		<h1>DataAgent LLM Tool Eval</h1>
		<div class="muted">生成时间：${escapeHtml(generatedAt)} · 模型：${escapeHtml(config.model)} · 题库：${CASES.length} · 抽样：${config.caseLimit}/轮 · 运行轮数：${config.runs} · 实际 Case：${caseResults.length} · 最多 grep 轮次：${config.maxGrepRounds} · 每轮 query：${config.queriesPerRound} · Search TopK：${config.topK} · 命中即停</div>
	</header>
	<main>
		<section class="cards">
			<div class="card"><h3>最终回答命中</h3><div class="kpi">${grepHits}/${caseResults.length} → ${grepSearchHits}/${caseResults.length}</div><p class="muted">LLM + grep 对比 LLM + search + grep</p></div>
			<div class="card"><h3>工具阶段找到</h3><div class="kpi">${grepFound}/${caseResults.length} → ${grepSearchFound}/${caseResults.length}</div><p class="muted">最多 grep 轮次内，工具输出是否出现期望文件</p></div>
			<div class="card"><h3>平均首次命中轮次 <span class="badge">越低越好</span></h3><div class="kpi">${formatAverage(grepAverageRound)} → ${formatAverage(grepSearchAverageRound)}</div><p class="muted">0 表示 codebase search 不用 grep 已命中</p></div>
			<div class="card"><h3>Total Tokens</h3><div class="kpi">${grepTotal.toLocaleString()} → ${grepSearchTotal.toLocaleString()}</div><p class="muted">真实 API usage.total_tokens 汇总</p></div>
		</section>
		<section class="table-card" style="margin-top:18px">
			<h2>怎么读结论</h2>
			<table>
				<thead><tr><th>指标</th><th>怎么看</th><th>LLM + grep</th><th>LLM + search + grep</th><th>差值</th></tr></thead>
				<tbody>
					<tr><td>最终回答命中</td><td>越高越好</td><td>${grepHits}/${caseResults.length}</td><td>${grepSearchHits}/${caseResults.length}</td><td>${formatDelta(grepHits, grepSearchHits, false)}</td></tr>
					<tr><td>工具阶段找到</td><td>越高越好</td><td>${grepFound}/${caseResults.length}</td><td>${grepSearchFound}/${caseResults.length}</td><td>${formatDelta(grepFound, grepSearchFound, false)}</td></tr>
					<tr><td>平均首次命中轮次</td><td>越低越好；0 表示 search 直接命中</td><td>${formatAverage(grepAverageRound)}</td><td>${formatAverage(grepSearchAverageRound)}</td><td>${formatDelta(grepAverageRound ?? 0, grepSearchAverageRound ?? 0, true)}</td></tr>
					<tr><td>Total Tokens</td><td>越低越好，但要结合命中率看</td><td>${grepTotal.toLocaleString()}</td><td>${grepSearchTotal.toLocaleString()}</td><td>${formatDelta(grepTotal, grepSearchTotal, true)}</td></tr>
					<tr><td>grep 次数</td><td>越低越好，代表少走弯路</td><td>${grepCalls}</td><td>${grepSearchCalls}</td><td>${formatDelta(grepCalls, grepSearchCalls, true)}</td></tr>
					<tr><td>工具输出长度</td><td>越低越好，代表塞给模型的 grep 结果更短</td><td>${grepToolChars.toLocaleString()}</td><td>${grepSearchToolChars.toLocaleString()}</td><td>${formatDelta(grepToolChars, grepSearchToolChars, true)}</td></tr>
				</tbody>
			</table>
		</section>
		<section class="table-card" style="margin-top:18px">
			<h2>测试方法</h2>
			<table><tbody>
				<tr><th>LLM + grep</th><td>模型每轮先决定 grep 关键词，脚本执行本地 <span class="mono">rg</span>，再把结果交还给模型继续下一轮。</td></tr>
				<tr><th>LLM + search + grep</th><td>先用 <span class="mono">.scripts/codebase-index.json</span> 做 codebase search 召回，再让模型基于召回结果继续多轮 grep。</td></tr>
				<tr><th>随机抽样</th><td>题库共 ${CASES.length} 个 case，每轮随机抽 ${Math.min(config.caseLimit, CASES.length)} 个，运行 ${config.runs} 轮；可通过 <span class="mono">LLM_EVAL_RANDOM_SEED</span> 固定随机结果。</td></tr>
				<tr><th>最多轮次</th><td>两边都最多执行 ${config.maxGrepRounds} 轮 grep，每轮最多 ${config.queriesPerRound} 个查询；一旦工具输出或 search seed 命中期望文件，就停止后续 grep。</td></tr>
				<tr><th>命中阈值</th><td>单文件 case 命中 1 个期望文件即成功；多文件 case 默认至少命中 2 个期望文件才算成功，避免只碰到一个弱相关文件就提前停止。</td></tr>
				<tr><th>首次命中轮次</th><td>工具输出首次达到命中阈值的轮次。增强组如果 search seed 已达到阈值，记为 0。</td></tr>
			</tbody></table>
		</section>
		<section class="chart-grid" style="margin-top:18px">
			<div class="chart-card"><h3>命中数 <span class="badge">越高越好</span></h3><div id="hitChart" class="chart-box"></div></div>
			<div class="chart-card"><h3>Token 用量 <span class="badge">越低越好</span></h3><div id="tokenChart" class="chart-box"></div></div>
			<div class="chart-card"><h3>首次命中轮次 <span class="badge">越低越好</span></h3><div id="roundChart" class="chart-box"></div></div>
			<div class="chart-card"><h3>工具输出长度 <span class="badge">越低越好</span></h3><div id="toolChart" class="chart-box"></div></div>
		</section>
		<section class="table-card" style="margin-top:18px">
			<h2>汇总表</h2>
			<table>
				<thead><tr><th>方案</th><th>最终回答命中</th><th>工具阶段找到</th><th>Prompt Tokens</th><th>Completion Tokens</th><th>Total Tokens</th><th>grep 次数</th><th>工具输出 chars</th></tr></thead>
				<tbody>
					<tr><td>LLM + grep</td><td>${grepHits}/${caseResults.length}</td><td>${grepFound}/${caseResults.length}</td><td>${grepPrompt.toLocaleString()}</td><td>${grepCompletion.toLocaleString()}</td><td>${grepTotal.toLocaleString()}</td><td>${grepCalls}</td><td>${grepToolChars.toLocaleString()}</td></tr>
					<tr><td>LLM + search + grep</td><td>${grepSearchHits}/${caseResults.length}</td><td>${grepSearchFound}/${caseResults.length}</td><td>${grepSearchPrompt.toLocaleString()}</td><td>${grepSearchCompletion.toLocaleString()}</td><td>${grepSearchTotal.toLocaleString()}</td><td>${grepSearchCalls}</td><td>${grepSearchToolChars.toLocaleString()}</td></tr>
				</tbody>
			</table>
		</section>
		<h2>Case 明细</h2>
		${caseResults
			.map(
				(item) => `<section class="case-card">
					<h3><span class="mono">${escapeHtml(item.id)}</span> · ${escapeHtml(item.question)}</h3>
					<div class="compare-grid">
						<div>
							<h3>LLM + grep</h3>
							${renderToolRounds(item.grep, item.expectedFiles)}
						</div>
						<div>
							<h3>LLM + search + grep</h3>
							${renderToolRounds(item.grepSearch, item.expectedFiles)}
						</div>
					</div>
				</section>`,
			)
			.join('\n')}
	</main>
	<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
	<script>
		const chartData = ${JSON.stringify(chartData)};
		function createChart(id, option) {
			const el = document.getElementById(id);
			if (!el || typeof echarts === 'undefined') return;
			const chart = echarts.init(el);
			chart.setOption(option);
			window.addEventListener('resize', () => chart.resize());
		}
		createChart('hitChart', {
			tooltip: { trigger: 'axis' },
			legend: { top: 0 },
			grid: { left: 42, right: 16, bottom: 36, top: 42 },
			xAxis: { type: 'category', data: chartData.hits.names },
			yAxis: { type: 'value', name: 'case 数', minInterval: 1, max: chartData.hits.total },
			series: [
				{ name: '最终回答命中', type: 'bar', data: chartData.hits.answer, itemStyle: { color: '#2563eb' } },
				{ name: '工具阶段找到', type: 'bar', data: chartData.hits.tool, itemStyle: { color: '#0f766e' } }
			]
		});
		createChart('tokenChart', {
			tooltip: { trigger: 'axis' },
			legend: { top: 0 },
			grid: { left: 58, right: 16, bottom: 36, top: 42 },
			xAxis: { type: 'category', data: chartData.tokens.names },
			yAxis: { type: 'value', name: 'tokens' },
			series: [
				{ name: 'LLM + grep', type: 'bar', data: chartData.tokens.grep, itemStyle: { color: '#f59e0b' } },
				{ name: 'LLM + search + grep', type: 'bar', data: chartData.tokens.grepSearch, itemStyle: { color: '#0f766e' } }
			]
		});
		createChart('roundChart', {
			tooltip: {
				trigger: 'axis',
				formatter: function (params) {
					return params.map(function (item) {
						const value = item.value > ${config.maxGrepRounds} ? '未命中' : item.value;
						return item.marker + item.seriesName + ': ' + value;
					}).join('<br/>');
				}
			},
			legend: { top: 0 },
			grid: { left: 58, right: 16, bottom: 70, top: 42 },
			xAxis: { type: 'category', data: chartData.rounds.names, axisLabel: { rotate: 30 } },
			yAxis: { type: 'value', name: '轮次', minInterval: 1, axisLabel: { formatter: function (value) { return value > ${config.maxGrepRounds} ? '未命中' : value; } } },
			series: [
				{ name: 'LLM + grep', type: 'line', smooth: true, data: chartData.rounds.grep, itemStyle: { color: '#f59e0b' } },
				{ name: 'LLM + search + grep', type: 'line', smooth: true, data: chartData.rounds.grepSearch, itemStyle: { color: '#0f766e' } }
			]
		});
		createChart('toolChart', {
			tooltip: { trigger: 'axis' },
			legend: { top: 0 },
			grid: { left: 70, right: 16, bottom: 70, top: 42 },
			xAxis: { type: 'category', data: chartData.toolChars.names, axisLabel: { rotate: 30 } },
			yAxis: { type: 'value', name: 'chars' },
			series: [
				{ name: 'LLM + grep', type: 'bar', data: chartData.toolChars.grep, itemStyle: { color: '#f59e0b' } },
				{ name: 'LLM + search + grep', type: 'bar', data: chartData.toolChars.grepSearch, itemStyle: { color: '#0f766e' } }
			]
		});
	</script>
</body>
</html>`;
}

async function main() {
	await loadDotenv();
	const config = getConfig();
	const codebaseCorpus = await loadCodebaseCorpus();
	const random = createRandom(config.randomSeed);
	const caseResults = [];

	for (let run = 1; run <= config.runs; run++) {
		const selectedCases = sampleCases(CASES, config.caseLimit, random);
		console.log(
			`Run ${run}/${config.runs}: ${selectedCases.map((item) => item.id).join(', ')}`,
		);
		for (const testCase of selectedCases) {
			const runCase = {
				...testCase,
				id: `run${run}-${testCase.id}`,
				caseId: testCase.id,
				run,
			};
			console.log(`Running ${runCase.id}...`);
			const codebaseResults = searchCorpus(
				codebaseCorpus,
				runCase.question,
				config.topK,
			);
			const grep = await runToolLoop({
				testCase: runCase,
				mode: 'grep',
				config,
			});
			const grepSearch = await runToolLoop({
				testCase: runCase,
				mode: 'grep-search',
				config,
				codebaseResults,
			});
			caseResults.push({ ...runCase, grep, grepSearch });
		}
	}

	const generatedAt = new Date();
	const timestamp = formatTimestamp(generatedAt);
	await fs.mkdir(REPORT_DIR, { recursive: true });
	const outputPath = await uniqueReportPath(
		path.join(REPORT_DIR, `${timestamp}.html`),
	);
	await fs.writeFile(
		outputPath,
		renderHtml({
			generatedAt: generatedAt.toLocaleString('zh-CN', {
				timeZone: 'Asia/Shanghai',
				hour12: false,
			}),
			config,
			caseResults,
		}),
	);

	const grepHits = caseResults.filter((item) => item.grep.eval.expectedHit).length;
	const grepSearchHits = caseResults.filter(
		(item) => item.grepSearch.eval.expectedHit,
	).length;
	console.log('LLM Tool Eval 完成');
	console.log(`报告: ${outputPath}`);
	console.log(`Case pool: ${CASES.length}, runs: ${config.runs}, seed: ${config.randomSeed}`);
	console.log(`LLM + grep hits: ${grepHits}/${caseResults.length}`);
	console.log(`LLM + search + grep hits: ${grepSearchHits}/${caseResults.length}`);
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
