# Codebase Index 改造说明

## 背景

当前项目已经有一套 AI 上下文治理机制：`pnpm gen:ctx` 会基于源码中的 JSDoc/TSDoc、Vue 组件定义和目录结构生成分散在各模块目录下的 `README.md`。这套机制能帮助 AI 先理解模块边界，再进入具体源码，属于一个轻量的 **AI-readable documentation index**。

Cursor 的 codebase index 思路更进一步。它不是只生成文档，而是构建一个面向 Agent 的检索系统：把代码切成可检索的 chunk，记录路径、符号、行号、依赖、摘要和索引新鲜度，再根据用户问题动态召回最相关的代码上下文。

本次改造目标不是一次性复刻 Cursor，而是把现有 README 索引升级为可演进的 **agent-oriented retrieval index**。

## 当前状态

现有能力：

- 使用 `vue-docgen-api` 解析 Vue 组件，生成组件级 README。
- 使用 `ts-morph` 解析 TypeScript 逻辑模块，生成类、函数、接口和导出变量文档。
- 递归生成目录 README，形成模块地图。
- 使用 `.scripts/ai-gen-cache.json` 记录文件 MD5，实现 README 增量生成。

当前不足：

- README 是给人和 AI 阅读的文档，不是机器可直接检索的结构化索引。
- 缺少函数级、组件级、文件级 chunk。
- 缺少行号、符号类型、导入依赖等检索元数据。
- 缺少本地搜索入口，AI 仍需要自己打开目录 README 再找代码。
- 缺少 context packing 策略，不能根据问题自动挑选最相关文件。
- 缺少语义向量召回和离线评测。

## 改造目标

### 阶段一：机器可读索引

在保留原 README 生成能力的基础上，额外生成 `.scripts/codebase-index.json`。

索引包含：

- 文件路径、文件类型、内容 hash。
- README 路径。
- import 依赖。
- TypeScript 导出符号、类、函数、接口、变量。
- Vue 组件摘要、Props、Slots、Events。
- 符号行号范围。
- 可检索 chunks。
- chunk 只保存短 `searchText`，不保存源码正文；需要源码时根据 `file + startLine + endLine` 现读本地文件。

这一阶段的目标是让代码库有一个稳定的机器可读上下文地图。

生成流程：

1. `package.json` 中的 `gen:ctx` 执行 `node scripts/gen-ai-context.mjs`。
2. `scripts/gen-ai-context.mjs` 先按原逻辑生成/刷新各模块 `README.md`。
3. 随后调用 `scripts/utils/index-engine.mjs` 里的 `buildCodebaseIndex()`。
4. `buildCodebaseIndex()` 扫描 `app/**/*.ts` 和 `app/**/*.vue`，排除 `.d.ts` 与 README。
5. TypeScript 文件通过 `ts-morph` 提取 class/function/interface/export variable、行号、JSDoc 摘要、imports/exports。
6. Vue 文件通过 `vue-docgen-api` 提取组件名、props、slots、events、description，并记录组件级 chunk。
7. 最终写入 `.scripts/codebase-index.json`。索引里只保存文件路径、符号、行号、摘要和短 `searchText`，不保存完整源码。

### 阶段二：本地关键词检索

新增 `pnpm ctx:search -- "问题"` 命令，基于 `.scripts/codebase-index.json` 做本地关键词召回。搜索只依赖索引里的短 `searchText`，不把源码复制进索引。

这一阶段先不接 embedding，重点是把“问一个问题，返回相关文件/函数/组件”的闭环跑通。

### 阶段三：调用关系与上下文打包

后续扩展：

- import graph。
- route -> component -> store -> service -> API 链路。
- component usage graph。
- store action usage graph。
- context packer：根据问题返回 TopK 文件、符号、README 和源码片段。

### 阶段四：语义检索

后续可接入 embedding：

- 对 chunk 的 `title + summary + signature + searchText` 生成向量。
- 存入 SQLite/LanceDB/Chroma/pgvector。
- 关键词检索与语义检索混合召回。
- 对召回结果做 rerank。

### 阶段五：评测体系

准备固定问题集，例如：

- 聊天流式输出在哪里处理？
- 报告 ECharts 是怎么渲染的？
- 数据源 Schema 初始化在哪里触发？
- 智能体和数据源如何关联？

评估指标：

- Top1 文件命中率。
- Top3 文件命中率。
- 符号命中率。
- AI 回答是否能给出正确修改点。

## 索引结构

`.scripts/codebase-index.json` 的核心结构：

```json
{
  "version": 1,
  "generatedAt": "2026-08-04T00:00:00.000Z",
  "root": "/path/to/project",
  "stats": {
    "files": 42,
    "chunks": 180
  },
  "files": [
    {
      "path": "app/stores/chat.ts",
      "kind": "ts",
      "hash": "md5",
      "readmePath": "app/stores/README.md",
      "imports": ["~/services/chat/index"],
      "exports": ["useChatStore"],
      "symbols": [
        {
          "id": "app/stores/chat.ts#useChatStore",
          "name": "useChatStore",
          "kind": "variable",
          "startLine": 36,
          "endLine": 640,
          "summary": "聊天状态管理"
        }
      ]
    }
  ],
  "chunks": [
    {
      "id": "app/stores/chat.ts#useChatStore",
      "file": "app/stores/chat.ts",
      "kind": "variable",
      "title": "useChatStore",
      "startLine": 36,
      "endLine": 640,
      "summary": "聊天状态管理",
      "searchText": "useChatStore\nvariable\n聊天状态管理"
    }
  ]
}
```

## 新增命令

```bash
# 生成 README + 机器可读索引
pnpm gen:ctx

# 从索引里搜索相关代码上下文
pnpm ctx:search -- "聊天流式输出在哪里处理"

# 跑内置检索 case，对比 README/路径基线和结构化索引增强效果
pnpm ctx:eval

# 真实调用 OpenAI-compatible/DeepSeek 模型，对比 LLM + grep 和 LLM + codebase search + grep
pnpm ctx:llm-eval
```

`pnpm ctx:eval` 会在 `.scripts/context-eval-reports/` 下生成 HTML 报告，文件名使用上海时区分钟级时间戳，例如 `2026-08-04-12:38.html`。

`pnpm ctx:llm-eval` 会读取 `.env`，支持以下配置：

```bash
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 可选：减少现场演示调用次数
LLM_EVAL_CASE_LIMIT=3
LLM_EVAL_RUNS=1
LLM_EVAL_RANDOM_SEED=
LLM_EVAL_TOP_K=5
LLM_EVAL_MAX_OUTPUT_TOKENS=700
LLM_EVAL_MAX_GREP_ROUNDS=3
LLM_EVAL_QUERIES_PER_ROUND=2
LLM_EVAL_RG_MAX_COUNT=20
```

LLM 评测报告输出到 `.scripts/context-llm-eval-reports/`。它对比的是两种更接近 Code Agent 的真实工具链路：

- **LLM + grep**：模型每轮先决定 grep/rg 关键词，脚本执行本地 `rg`，再把结果喂回模型继续下一轮。
- **LLM + codebase search + grep**：先用 `.scripts/codebase-index.json` 召回相关 chunk，模型基于召回结果继续多轮 grep/rg。

报告会统计最多 grep 轮次下的最终回答命中率、工具阶段首次找到正确文件的轮次、grep 调用次数、工具输出长度，以及模型 API 返回的真实 `usage` token。评测采用命中即停策略：单文件 case 命中 1 个期望文件即成功；多文件 case 默认至少命中 2 个期望文件才算成功，避免只召回一个弱相关文件就提前停止。如果 codebase search seed 已达到命中阈值，增强组不再继续 grep；如果某轮 grep 输出达到命中阈值，也停止后续 grep。

脚本优先调用本地 `rg`。如果运行环境没有安装 `rg`，会自动降级为脚本内置的 JS 文件扫描，并在报告工具输出中标记 `[js-grep fallback]`；如果 `rg` 执行异常，会显示 `[rg error ...]`，避免把环境问题误判为“没有匹配”。

LLM 评测内置较大的 case 题库，每轮会从题库中随机抽取 `LLM_EVAL_CASE_LIMIT` 个 case，连续运行 `LLM_EVAL_RUNS` 轮。默认不配置 `LLM_EVAL_RANDOM_SEED` 时每次运行都会随机；配置固定 seed 后可以复现实验结果。

## 与 Cursor Index 的对应关系

相同思路：

- 都从真实源码生成上下文。
- 都强调增量更新。
- 都把代码拆成可定位的上下文单元。
- 都服务于 Agent 的代码理解和修改。

当前差距：

- Cursor 有 chunk 级 embedding，本项目阶段一只有结构化 JSON 和关键词检索。
- Cursor 有 Merkle Tree 级别的团队索引复用，本项目只有本地文件 hash。
- Cursor 同时支持语义搜索和 fast regex search，本项目阶段二先做轻量关键词搜索。
- Cursor 有完整的 context packing 和评测体系，本项目后续补齐。

## 落地原则

- 保留已有 README 生成能力，不破坏当前 AI 上下文治理流程。
- 先产出稳定 JSON，再逐步接检索、依赖图和向量能力。
- 生成内容必须来自源码 AST、组件解析和文件内容，避免手写漂移。
- 索引文件放在 `.scripts/` 下，作为本地生成产物。
