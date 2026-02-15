# 逻辑模块: graph

## 模块描述
图搜索服务，处理与后端的流式 (SSE) 交互，实现搜索过程的实时反馈

## 类 (Classes)
### Class: `GraphService`
图搜索业务逻辑处理类
#### 公开方法:
- `streamSearch`: 发起流式搜索请求 (SSE)

## 类型定义 (Interfaces)
### `GraphRequest`
**描述**: 图搜索服务，处理与后端的流式 (SSE) 交互，实现搜索过程的实时反馈
```typescript
export interface GraphRequest {
  /** 智能体 ID */
  agentId: string;
  /** 会话线程 ID */
  threadId?: string;
  /** 用户查询语句 */
  query: string;
  /** 是否需要人工反馈 */
  humanFeedback: boolean;
  /** 人工反馈内容 */
  humanFeedbackContent?: string;
  /** 是否拒绝了之前的计划 */
  rejectedPlan: boolean;
  /** 是否仅执行 NL2SQL */
  nl2sqlOnly: boolean;
}
```

### `GraphNodeResponse`
**描述**: 图节点响应数据接口
```typescript
export interface GraphNodeResponse {
  /** 智能体 ID */
  agentId: string;
  /** 线程 ID */
  threadId: string;
  /** 当前执行的节点名称 */
  nodeName: string;
  /** 文本内容类型 */
  textType: TextType;
  /** 文本内容 */
  text: string;
  /** 是否发生错误 */
  error: boolean;
  /** 是否已完成 */
  complete: boolean;
}
```


---
> 🤖 AI 提示: 逻辑实现请参考 `graph/index.ts`。