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
import path from 'path';
import { globby } from 'globby';

const INDEX_FILE = '.scripts/codebase-index.json';
const REPORT_DIR = '.scripts/context-eval-reports';
const TOP_K = 5;

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
		id: 'agent-datasource',
		question: '智能体如何关联数据源，并初始化 Schema？',
		expectedFiles: [
			'app/services/agentDatasource/index.ts',
			'app/pages/system/data-sources/index.vue',
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
		id: 'result-set',
		question: 'SQL 执行结果集表格和分页展示在哪里？',
		expectedFiles: [
			'app/components/chat/ChatResultSet.vue',
			'app/services/resultSet/index.ts',
		],
	},
	{
		id: 'prompt-config',
		question: 'SQL 生成、报告生成等 Prompt 配置页面在哪里？',
		expectedFiles: [
			'app/pages/prompt-config/index.vue',
			'app/services/prompt/index.ts',
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
		id: 'semantic-model',
		question: '语义模型字段业务名称、同义词和导入能力在哪里维护？',
		expectedFiles: [
			'app/pages/knowledge/semantic-models.vue',
			'app/services/semanticModel/index.ts',
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

function tokenize(text) {
	const source = String(text).toLowerCase();
	const terms = source
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

function scoreText(fields, terms) {
	const normalized = fields.map((field) => String(field || '').toLowerCase());
	let score = 0;

	for (const term of terms) {
		normalized.forEach((field, index) => {
			if (!field) return;
			const hits = field.split(term).length - 1;
			if (hits <= 0) return;
			const weight = index === 0 ? 8 : index === 1 ? 5 : index === 2 ? 4 : 1;
			score += Math.min(hits, 8) * weight;
		});
	}

	return score;
}

function normalizeSourceFile(filePath) {
	if (!filePath) return '';
	if (!filePath.endsWith('/README.md')) return filePath;
	return filePath.replace(/\/README\.md$/, '');
}

async function buildBaselineCorpus() {
	const readmes = await globby(['app/**/README.md'], { absolute: false });
	const files = await globby(['app/**/*.{ts,vue}', '!app/**/*.d.ts'], {
		absolute: false,
	});

	const corpus = [];
	for (const readme of readmes.sort()) {
		const content = await fs.readFile(readme, 'utf-8');
		corpus.push({
			file: readme,
			sourceFile: normalizeSourceFile(readme),
			kind: 'readme',
			title: readme,
			summary: 'README 目录/模块文档',
			searchText: content,
		});
	}

	for (const file of files.sort()) {
		corpus.push({
			file,
			sourceFile: file,
			kind: 'path',
			title: file,
			summary: '源码路径基线',
			searchText: path.basename(file),
		});
	}

	return corpus;
}

async function loadEnhancedCorpus() {
	let index;
	try {
		index = JSON.parse(await fs.readFile(INDEX_FILE, 'utf-8'));
	} catch {
		throw new Error(`未找到 ${INDEX_FILE}，请先运行 pnpm gen:ctx`);
	}

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

function searchCorpus(corpus, question) {
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
		.slice(0, TOP_K);
}

function evaluateResults(results, expectedFiles) {
	const rank = results.findIndex((item) => expectedFiles.includes(item.sourceFile));
	const contextChars = results.reduce(
		(sum, item) => sum + buildContextPayload(item).length,
		0,
	);
	return {
		hitRank: rank >= 0 ? rank + 1 : null,
		top1: rank === 0,
		top3: rank >= 0 && rank < 3,
		top5: rank >= 0 && rank < 5,
		mrr: rank >= 0 ? 1 / (rank + 1) : 0,
		contextChars,
		estimatedTokens: estimateTokensFromText(
			results.map(buildContextPayload).join('\n'),
		),
	};
}

function buildContextPayload(item) {
	return [
		`title: ${item.title || ''}`,
		`file: ${item.file || ''}`,
		item.startLine ? `line: ${item.startLine}-${item.endLine || item.startLine}` : '',
		`kind: ${item.kind || ''}`,
		`summary: ${item.summary || ''}`,
		`searchText: ${item.searchText || ''}`,
	]
		.filter(Boolean)
		.join('\n');
}

function estimateTokensFromText(text) {
	const source = String(text || '');
	const cjkChars = source.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
	const nonCjkChars = source.length - cjkChars;
	return Math.ceil(cjkChars / 1.5 + nonCjkChars / 4);
}

function summarize(caseResults, key) {
	const total = caseResults.length;
	const values = caseResults.map((item) => item[key].metrics);
	const hits = (metric) => values.filter((item) => item[metric]).length;
	const mrr = values.reduce((sum, item) => sum + item.mrr, 0) / total;
	const totalTokens = values.reduce(
		(sum, item) => sum + item.estimatedTokens,
		0,
	);
	const avgTokens = totalTokens / total;
	const totalContextChars = values.reduce(
		(sum, item) => sum + item.contextChars,
		0,
	);
	const foundRanks = values
		.map((item) => item.hitRank)
		.filter((rank) => typeof rank === 'number');
	const avgRank = foundRanks.length
		? foundRanks.reduce((sum, rank) => sum + rank, 0) / foundRanks.length
		: null;

	return {
		total,
		top1: hits('top1'),
		top3: hits('top3'),
		top5: hits('top5'),
		mrr,
		avgRank,
		totalTokens,
		avgTokens,
		totalContextChars,
	};
}

function formatPercent(value, total) {
	return `${((value / total) * 100).toFixed(1)}%`;
}

function formatRank(rank) {
	return rank == null ? '未命中' : `#${rank}`;
}

function renderResultList(results, expectedFiles) {
	if (!results.length) return '<div class="muted">无召回结果</div>';
	return `<ol class="result-list">${results
		.map((item) => {
			const hit = expectedFiles.includes(item.sourceFile);
			const location = item.startLine
				? `${item.file}:${item.startLine}`
				: item.file;
			return `<li class="${hit ? 'hit' : ''}">
				<div><strong>${escapeHtml(item.title)}</strong> <span class="score">score=${item.score}</span></div>
				<div class="path">${escapeHtml(location)} · ${escapeHtml(item.kind)}</div>
				${item.summary ? `<div class="summary">${escapeHtml(item.summary)}</div>` : ''}
			</li>`;
		})
		.join('')}</ol>`;
}

function renderMetricCard(title, summary) {
	return `<div class="metric-card">
		<h3>${escapeHtml(title)}</h3>
		<div class="metric-grid">
			<div><span>${summary.top1}</span><label>Top1</label></div>
			<div><span>${summary.top3}</span><label>Top3</label></div>
			<div><span>${summary.top5}</span><label>Top5</label></div>
			<div><span>${summary.mrr.toFixed(3)}</span><label>MRR</label></div>
		</div>
		<p>Top1 ${formatPercent(summary.top1, summary.total)} · Top3 ${formatPercent(summary.top3, summary.total)} · Top5 ${formatPercent(summary.top5, summary.total)}</p>
	</div>`;
}

function renderComparisonTable(baselineSummary, enhancedSummary) {
	const rows = [
		{
			metric: 'Top1',
			meaning: '期望文件排在第 1 位的 case 数',
			baseline: `${baselineSummary.top1}/${baselineSummary.total} (${formatPercent(baselineSummary.top1, baselineSummary.total)})`,
			enhanced: `${enhancedSummary.top1}/${enhancedSummary.total} (${formatPercent(enhancedSummary.top1, enhancedSummary.total)})`,
			delta: `${enhancedSummary.top1 - baselineSummary.top1 >= 0 ? '+' : ''}${enhancedSummary.top1 - baselineSummary.top1}`,
			positive: enhancedSummary.top1 >= baselineSummary.top1,
		},
		{
			metric: 'Top3',
			meaning: '期望文件出现在前 3 个结果内的 case 数',
			baseline: `${baselineSummary.top3}/${baselineSummary.total} (${formatPercent(baselineSummary.top3, baselineSummary.total)})`,
			enhanced: `${enhancedSummary.top3}/${enhancedSummary.total} (${formatPercent(enhancedSummary.top3, enhancedSummary.total)})`,
			delta: `${enhancedSummary.top3 - baselineSummary.top3 >= 0 ? '+' : ''}${enhancedSummary.top3 - baselineSummary.top3}`,
			positive: enhancedSummary.top3 >= baselineSummary.top3,
		},
		{
			metric: 'Top5',
			meaning: '期望文件出现在前 5 个结果内的 case 数',
			baseline: `${baselineSummary.top5}/${baselineSummary.total} (${formatPercent(baselineSummary.top5, baselineSummary.total)})`,
			enhanced: `${enhancedSummary.top5}/${enhancedSummary.total} (${formatPercent(enhancedSummary.top5, enhancedSummary.total)})`,
			delta: `${enhancedSummary.top5 - baselineSummary.top5 >= 0 ? '+' : ''}${enhancedSummary.top5 - baselineSummary.top5}`,
			positive: enhancedSummary.top5 >= baselineSummary.top5,
		},
		{
			metric: 'MRR',
			meaning: '平均倒数排名，越接近 1 说明正确文件越靠前',
			baseline: baselineSummary.mrr.toFixed(3),
			enhanced: enhancedSummary.mrr.toFixed(3),
			delta: `${enhancedSummary.mrr - baselineSummary.mrr >= 0 ? '+' : ''}${(enhancedSummary.mrr - baselineSummary.mrr).toFixed(3)}`,
			positive: enhancedSummary.mrr >= baselineSummary.mrr,
		},
		{
			metric: 'Avg Tokens',
			meaning: '每个问题 TopK 检索结果的平均上下文 token 估算',
			baseline: Math.round(baselineSummary.avgTokens).toLocaleString(),
			enhanced: Math.round(enhancedSummary.avgTokens).toLocaleString(),
			delta: `${Math.round(enhancedSummary.avgTokens - baselineSummary.avgTokens).toLocaleString()}`,
			positive: enhancedSummary.avgTokens <= baselineSummary.avgTokens,
		},
		{
			metric: 'Total Tokens',
			meaning: '所有 case 的检索上下文 token 估算总和',
			baseline: baselineSummary.totalTokens.toLocaleString(),
			enhanced: enhancedSummary.totalTokens.toLocaleString(),
			delta: `${(enhancedSummary.totalTokens - baselineSummary.totalTokens).toLocaleString()}`,
			positive: enhancedSummary.totalTokens <= baselineSummary.totalTokens,
		},
	];

	return `<section class="table-card">
		<h2>指标对比</h2>
		<table>
			<thead>
				<tr>
					<th>指标</th>
					<th>含义</th>
					<th>Baseline</th>
					<th>Enhanced</th>
					<th>提升</th>
				</tr>
			</thead>
			<tbody>
				${rows
					.map(
						(row) => `<tr>
							<td><strong>${escapeHtml(row.metric)}</strong></td>
							<td>${escapeHtml(row.meaning)}</td>
							<td>${escapeHtml(row.baseline)}</td>
							<td>${escapeHtml(row.enhanced)}</td>
							<td class="${row.positive ? 'positive' : 'negative'}">${escapeHtml(row.delta)}</td>
						</tr>`,
					)
					.join('')}
			</tbody>
		</table>
	</section>`;
}

function renderMetricExplanation() {
	return `<section class="table-card">
		<h2>指标解释</h2>
		<table>
			<thead>
				<tr>
					<th>指标</th>
					<th>怎么理解</th>
					<th>面试时可以怎么说</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><strong>Top1</strong></td>
					<td>正确文件是否排在检索结果第 1 位。</td>
					<td>代表“AI 第一眼能不能定位到正确代码”。</td>
				</tr>
				<tr>
					<td><strong>Top3</strong></td>
					<td>正确文件是否出现在前 3 个结果里。</td>
					<td>代表“AI 在较小上下文预算内能不能拿到关键文件”。</td>
				</tr>
				<tr>
					<td><strong>Top5</strong></td>
					<td>正确文件是否出现在前 5 个结果里。</td>
					<td>代表“检索是否基本覆盖相关上下文”。</td>
				</tr>
				<tr>
					<td><strong>MRR</strong></td>
					<td>Mean Reciprocal Rank。正确文件排第 1 位得 1 分，第 2 位得 0.5 分，第 3 位得 0.333 分；没命中得 0 分，再对所有 case 取平均。</td>
					<td>它比命中率更能体现排序质量，正确结果越靠前，MRR 越高。</td>
				</tr>
				<tr>
					<td><strong>Estimated Tokens</strong></td>
					<td>本脚本不调用 LLM，所以这里是本地估算：中文约 1.5 字/token，非中文约 4 字符/token，统计 TopK 检索结果会进入上下文的 payload。</td>
					<td>代表“同样解决问题时，大概要给模型塞多少检索上下文”，越低通常越省钱、越省上下文窗口。</td>
				</tr>
			</tbody>
		</table>
	</section>`;
}

function renderMethodology() {
	return `<section class="table-card">
		<h2>测试方法</h2>
		<table>
			<tbody>
				<tr>
					<th>Case 来源</th>
					<td>脚本内置 10 个 DataAgent 前端典型问题，例如 SSE 流式输出、ECharts 报告渲染、数据源配置、Human Feedback、会话状态恢复等。</td>
				</tr>
				<tr>
					<th>标准答案</th>
					<td>每个 case 配置 1 到 3 个期望命中文件，只要 TopK 结果里出现任意期望文件就算命中。</td>
				</tr>
				<tr>
					<th>Baseline</th>
					<td>只使用自动 README 内容和源码路径做关键词检索，模拟“没有结构化 codebase index”的情况。</td>
				</tr>
				<tr>
					<th>Enhanced</th>
					<td>使用 <span class="mono">.scripts/codebase-index.json</span> 里的文件、符号、行号、类型、summary、searchText 做结构化检索。</td>
				</tr>
				<tr>
					<th>Token 口径</th>
					<td>不调用真实模型，不产生 API token 账单；token 是对 TopK 检索结果上下文 payload 的本地估算，用于比较上下文成本。</td>
				</tr>
			</tbody>
		</table>
	</section>`;
}

function renderCaseSummaryTable(cases) {
	return `<section class="table-card">
		<h2>Case 命中总览</h2>
		<table>
			<thead>
				<tr>
					<th>Case</th>
					<th>问题</th>
					<th>Baseline 命中排名</th>
					<th>Enhanced 命中排名</th>
					<th>变化</th>
				</tr>
			</thead>
			<tbody>
				${cases
					.map((item) => {
						const baselineRank = item.baseline.metrics.hitRank;
						const enhancedRank = item.enhanced.metrics.hitRank;
						let change = '持平';
						if (baselineRank == null && enhancedRank != null) {
							change = '新增命中';
						} else if (baselineRank != null && enhancedRank == null) {
							change = '丢失命中';
						} else if (
							baselineRank != null &&
							enhancedRank != null &&
							enhancedRank < baselineRank
						) {
							change = `提前 ${baselineRank - enhancedRank} 位`;
						} else if (
							baselineRank != null &&
							enhancedRank != null &&
							enhancedRank > baselineRank
						) {
							change = `后退 ${enhancedRank - baselineRank} 位`;
						}
						return `<tr>
							<td><span class="mono">${escapeHtml(item.id)}</span></td>
							<td>${escapeHtml(item.question)}</td>
							<td>${escapeHtml(formatRank(baselineRank))}</td>
							<td>${escapeHtml(formatRank(enhancedRank))}</td>
							<td class="${change === '丢失命中' || change.startsWith('后退') ? 'negative' : 'positive'}">${escapeHtml(change)}</td>
						</tr>`;
					})
					.join('')}
			</tbody>
		</table>
	</section>`;
}

function renderChartSection() {
	return `<section class="chart-section">
		<h2>图表分析</h2>
		<div class="chart-grid">
			<div class="chart-card">
				<h3>命中率指标对比</h3>
				<div id="metricChart" class="chart-box"></div>
			</div>
			<div class="chart-card">
				<h3>上下文 Token 成本估算</h3>
				<div id="tokenChart" class="chart-box"></div>
			</div>
		</div>
		<div class="chart-card chart-card--wide">
			<h3>逐 Case 命中排名，数值越小越好；${TOP_K + 1} 表示 Top${TOP_K} 未命中</h3>
			<div id="rankChart" class="chart-box chart-box--wide"></div>
		</div>
	</section>`;
}

function buildChartData(cases, baselineSummary, enhancedSummary) {
	return {
		metrics: {
			names: ['Top1', 'Top3', 'Top5'],
			baseline: [baselineSummary.top1, baselineSummary.top3, baselineSummary.top5],
			enhanced: [enhancedSummary.top1, enhancedSummary.top3, enhancedSummary.top5],
			total: baselineSummary.total,
		},
		tokens: {
			names: ['总 Token', '平均 Token/Case'],
			baseline: [
				baselineSummary.totalTokens,
				Math.round(baselineSummary.avgTokens),
			],
			enhanced: [
				enhancedSummary.totalTokens,
				Math.round(enhancedSummary.avgTokens),
			],
		},
		ranks: {
			names: cases.map((item) => item.id),
			baseline: cases.map(
				(item) => item.baseline.metrics.hitRank || TOP_K + 1,
			),
			enhanced: cases.map(
				(item) => item.enhanced.metrics.hitRank || TOP_K + 1,
			),
		},
	};
}

function renderChartScript(chartData) {
	return `<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<script>
	const chartData = ${JSON.stringify(chartData)};
	function createChart(id, option) {
		const el = document.getElementById(id);
		if (!el || typeof echarts === 'undefined') return;
		const chart = echarts.init(el);
		chart.setOption(option);
		window.addEventListener('resize', () => chart.resize());
	}
	createChart('metricChart', {
		tooltip: { trigger: 'axis' },
		legend: { top: 0 },
		grid: { left: 36, right: 16, bottom: 36, top: 42 },
		xAxis: { type: 'category', data: chartData.metrics.names },
		yAxis: { type: 'value', minInterval: 1, max: chartData.metrics.total },
		series: [
			{ name: 'Baseline', type: 'bar', data: chartData.metrics.baseline, itemStyle: { color: '#94a3b8' } },
			{ name: 'Enhanced', type: 'bar', data: chartData.metrics.enhanced, itemStyle: { color: '#2563eb' } }
		]
	});
	createChart('tokenChart', {
		tooltip: { trigger: 'axis' },
		legend: { top: 0 },
		grid: { left: 58, right: 16, bottom: 36, top: 42 },
		xAxis: { type: 'category', data: chartData.tokens.names },
		yAxis: { type: 'value' },
		series: [
			{ name: 'Baseline', type: 'bar', data: chartData.tokens.baseline, itemStyle: { color: '#f59e0b' } },
			{ name: 'Enhanced', type: 'bar', data: chartData.tokens.enhanced, itemStyle: { color: '#0f766e' } }
		]
	});
	createChart('rankChart', {
		tooltip: { trigger: 'axis' },
		legend: { top: 0 },
		grid: { left: 40, right: 20, bottom: 70, top: 44 },
		xAxis: { type: 'category', data: chartData.ranks.names, axisLabel: { rotate: 30 } },
		yAxis: { type: 'value', minInterval: 1, inverse: true, min: 1, max: ${TOP_K + 1}, axisLabel: { formatter: function(value) { return value === ${TOP_K + 1} ? '未命中' : '#' + value; } } },
		series: [
			{ name: 'Baseline Rank', type: 'line', data: chartData.ranks.baseline, smooth: true, symbolSize: 8, itemStyle: { color: '#94a3b8' } },
			{ name: 'Enhanced Rank', type: 'line', data: chartData.ranks.enhanced, smooth: true, symbolSize: 8, itemStyle: { color: '#2563eb' } }
		]
	});
</script>`;
}

function renderHtmlReport({ generatedAt, cases, baselineSummary, enhancedSummary }) {
	const top1Delta = enhancedSummary.top1 - baselineSummary.top1;
	const top3Delta = enhancedSummary.top3 - baselineSummary.top3;
	const mrrDelta = enhancedSummary.mrr - baselineSummary.mrr;
	const tokenDelta = enhancedSummary.totalTokens - baselineSummary.totalTokens;
	const chartData = buildChartData(cases, baselineSummary, enhancedSummary);

	return `<!doctype html>
<html lang="zh-CN">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>DataAgent Codebase Index 评测报告</title>
	<style>
		body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f6f8fb; }
		header { padding: 32px 40px; background: linear-gradient(135deg, #ffffff 0%, #eef6ff 100%); border-bottom: 1px solid #e6ebf2; }
		main { padding: 28px 40px 48px; }
		h1 { margin: 0 0 8px; font-size: 26px; }
		h2 { margin: 32px 0 14px; font-size: 20px; }
		h3 { margin: 0 0 14px; font-size: 15px; }
		.muted { color: #667085; }
		.summary-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
		.metric-card, .delta-card, .case-card, .table-card { background: #fff; border: 1px solid #e6ebf2; border-radius: 10px; padding: 18px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04); }
		.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
		.metric-grid div { background: #f8fafc; border-radius: 8px; padding: 10px; }
		.metric-grid span { display: block; font-size: 22px; font-weight: 700; color: #0f4c81; }
		.metric-grid label { display: block; margin-top: 2px; font-size: 12px; color: #667085; }
		.delta-card { margin-top: 16px; display: flex; gap: 20px; flex-wrap: wrap; }
		.delta-card strong { color: #0f766e; }
		.table-card { margin-top: 18px; overflow-x: auto; }
		table { width: 100%; border-collapse: collapse; font-size: 13px; }
		th { text-align: left; background: #f8fafc; color: #475467; font-weight: 700; }
		th, td { border-bottom: 1px solid #edf1f6; padding: 10px 12px; vertical-align: top; }
		tbody tr:hover td { background: #fbfdff; }
		.positive { color: #047857; font-weight: 700; }
		.negative { color: #b42318; font-weight: 700; }
		.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
		.chart-section { margin-top: 24px; }
		.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
		.chart-card { background: #fff; border: 1px solid #e6ebf2; border-radius: 10px; padding: 18px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04); }
		.chart-card--wide { margin-top: 16px; }
		.chart-box { height: 280px; }
		.chart-box--wide { height: 340px; }
		.case-card { margin-bottom: 16px; }
		.case-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
		.case-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #667085; }
		.question { font-weight: 700; font-size: 16px; }
		.expected { font-size: 12px; color: #475467; margin-top: 8px; }
		.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 12px; background: #eef2ff; color: #3730a3; white-space: nowrap; }
		.compare-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
		.panel { border: 1px solid #edf1f6; border-radius: 8px; padding: 12px; background: #fcfdff; }
		.panel-title { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 10px; }
		.result-list { margin: 0; padding-left: 22px; }
		.result-list li { margin-bottom: 10px; padding-left: 4px; }
		.result-list li.hit { background: #ecfdf3; border-radius: 6px; padding: 6px 8px 6px 4px; }
		.path { margin-top: 2px; color: #475467; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
		.summary { margin-top: 3px; color: #667085; font-size: 12px; }
		.score { color: #667085; font-size: 12px; font-weight: 400; }
		@media (max-width: 900px) { header, main { padding-left: 18px; padding-right: 18px; } .summary-row, .compare-grid, .chart-grid { grid-template-columns: 1fr; } }
	</style>
</head>
<body>
	<header>
		<h1>DataAgent Codebase Index 评测报告</h1>
		<div class="muted">生成时间：${escapeHtml(generatedAt)} · Case 数：${cases.length} · TopK：${TOP_K}</div>
		<div class="delta-card">
			<div>Top1 提升：<strong>${top1Delta >= 0 ? '+' : ''}${top1Delta}</strong></div>
			<div>Top3 提升：<strong>${top3Delta >= 0 ? '+' : ''}${top3Delta}</strong></div>
			<div>MRR 提升：<strong>${mrrDelta >= 0 ? '+' : ''}${mrrDelta.toFixed(3)}</strong></div>
			<div>Token 变化：<strong>${tokenDelta >= 0 ? '+' : ''}${tokenDelta.toLocaleString()}</strong></div>
		</div>
	</header>
	<main>
		<section class="summary-row">
			${renderMetricCard('Baseline：README / 路径关键词', baselineSummary)}
			${renderMetricCard('Enhanced：结构化 Codebase Index', enhancedSummary)}
		</section>
		${renderChartSection()}
		${renderMethodology()}
		${renderComparisonTable(baselineSummary, enhancedSummary)}
		${renderMetricExplanation()}
		${renderCaseSummaryTable(cases)}
		<h2>Case 明细</h2>
		${cases
			.map(
				(item) => `<section class="case-card">
					<div class="case-head">
						<div>
							<div class="case-id">${escapeHtml(item.id)}</div>
							<div class="question">${escapeHtml(item.question)}</div>
							<div class="expected">期望命中：${item.expectedFiles.map(escapeHtml).join(' / ')}</div>
						</div>
						<div class="badge">Baseline ${formatRank(item.baseline.metrics.hitRank)} · Enhanced ${formatRank(item.enhanced.metrics.hitRank)}</div>
					</div>
					<div class="compare-grid">
						<div class="panel">
							<div class="panel-title"><span>Baseline</span><span>${formatRank(item.baseline.metrics.hitRank)}</span></div>
							${renderResultList(item.baseline.results, item.expectedFiles)}
						</div>
						<div class="panel">
							<div class="panel-title"><span>Enhanced</span><span>${formatRank(item.enhanced.metrics.hitRank)}</span></div>
							${renderResultList(item.enhanced.results, item.expectedFiles)}
						</div>
					</div>
				</section>`,
			)
			.join('\n')}
	</main>
	${renderChartScript(chartData)}
</body>
</html>`;
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

async function exists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const baselineCorpus = await buildBaselineCorpus();
	const enhancedCorpus = await loadEnhancedCorpus();

	const caseResults = CASES.map((testCase) => {
		const baselineResults = searchCorpus(baselineCorpus, testCase.question);
		const enhancedResults = searchCorpus(enhancedCorpus, testCase.question);
		return {
			...testCase,
			baseline: {
				results: baselineResults,
				metrics: evaluateResults(baselineResults, testCase.expectedFiles),
			},
			enhanced: {
				results: enhancedResults,
				metrics: evaluateResults(enhancedResults, testCase.expectedFiles),
			},
		};
	});

	const baselineSummary = summarize(caseResults, 'baseline');
	const enhancedSummary = summarize(caseResults, 'enhanced');
	const generatedAt = new Date();
	const timestamp = formatTimestamp(generatedAt);
	const reportHtml = renderHtmlReport({
		generatedAt: generatedAt.toLocaleString('zh-CN', {
			timeZone: 'Asia/Shanghai',
			hour12: false,
		}),
		cases: caseResults,
		baselineSummary,
		enhancedSummary,
	});

	await fs.mkdir(REPORT_DIR, { recursive: true });
	const outputPath = await uniqueReportPath(
		path.join(REPORT_DIR, `${timestamp}.html`),
	);
	await fs.writeFile(outputPath, reportHtml);

	console.log('Codebase Index 评测完成');
	console.log(`报告: ${outputPath}`);
	console.log(
		`Baseline Top1/Top3/MRR: ${baselineSummary.top1}/${baselineSummary.top3}/${baselineSummary.mrr.toFixed(3)}`,
	);
	console.log(
		`Enhanced Top1/Top3/MRR: ${enhancedSummary.top1}/${enhancedSummary.top3}/${enhancedSummary.mrr.toFixed(3)}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
