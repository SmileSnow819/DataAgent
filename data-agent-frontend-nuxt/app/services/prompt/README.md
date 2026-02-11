# 逻辑模块: index.ts

## 模块描述
提示词配置管理服务，处理优化提示词的查询、保存、启用/禁用及优先级调整

## 类 (Classes)
### Class: `PromptService`
提示词配置业务逻辑处理类
#### 公开方法:
- `listByType`: 根据类型加载优化配置列表
- `save`: 保存提示词配置
- `enable`: 启用指定配置
- `disable`: 禁用指定配置
- `delete`: 删除指定配置
- `batchEnable`: 批量启用配置
- `batchDisable`: 批量禁用配置
- `updatePriority`: 更新配置的优先级

## 导出变量 (Variables/Stores)
### `promptService`
- **描述**: 无描述
- **类型**: `PromptService`

## 类型定义 (Interfaces)
### `PromptConfig`
**描述**: 提示词配置实体接口
```typescript
export interface PromptConfig {
  /** 配置 ID */
  id?: number;
  /** 配置名称 */
  name: string;
  /** 配置描述 */
  description?: string;
  /** 优化提示词内容 */
  optimizationPrompt: string;
  /** 优先级 */
  priority?: number;
  /** 显示顺序 */
  displayOrder?: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 提示词类型 */
  promptType: string;
  /** 关联的智能体 ID */
  agentId?: number | null;
  /** 创建者 */
  creator?: string;
}
```

### `PromptConfigResponse`
**描述**: 提示词配置响应结构
```typescript
export interface PromptConfigResponse {
  /** 是否成功 */
  success: boolean;
  /** 提示消息 */
  message?: string;
  /** 返回数据 */
  data?: PromptConfig[] | PromptConfig;
}
```


---
> 🤖 AI 提示: 逻辑实现请参考 `index.ts`。