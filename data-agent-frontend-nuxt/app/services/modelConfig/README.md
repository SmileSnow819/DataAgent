# 逻辑模块: index.ts

## 模块描述
模型配置管理服务，处理 LLM 供应商信息、API 密钥、模型参数及就绪状态检查

## 类 (Classes)
### Class: `ModelConfigService`
模型配置业务逻辑处理类
#### 公开方法:
- `list`: 获取所有模型配置列表
- `add`: 新增模型配置
- `update`: 更新模型配置信息
- `delete`: 删除指定模型配置
- `activate`: 启用或切换当前激活的模型配置
- `testConnection`: 测试模型配置的连接有效性
- `checkReady`: 检查模型配置是否整体就绪 (对话和嵌入模型均需配置)

## 类型定义 (Interfaces)
### `ModelConfig`
**描述**: 模型配置实体接口
```typescript
export interface ModelConfig {
  /** 配置 ID */
  id?: number;
  /** 供应商 (如 openai, deepseek) */
  provider: string;
  /** API 密钥 */
  apiKey: string;
  /** 基础 URL */
  baseUrl: string;
  /** 模型名称 */
  modelName: string;
  /** 模型类型 */
  modelType: ModelType;
  /** 温度参数 (0-2) */
  temperature?: number;
  /** 最大生成 Token 数 */
  maxTokens?: number;
  /** 是否激活 */
  isActive?: boolean;
  /** 对话模型路径 */
  completionsPath?: string;
  /** 嵌入模型路径 */
  embeddingsPath?: string;
}
```

### `ModelCheckReady`
**描述**: 模型就绪状态检查结果接口
```typescript
export interface ModelCheckReady {
  /** 对话模型是否已配置 */
  chatModelReady: boolean;
  /** 嵌入模型是否已配置 */
  embeddingModelReady: boolean;
  /** 整体是否就绪 */
  ready: boolean;
}
```


---
> 🤖 AI 提示: 逻辑实现请参考 `index.ts`。