# 逻辑模块: presetQuestion

## 模块描述
预设问题管理服务，处理智能体首页展示的推荐问题

## 类 (Classes)
### Class: `PresetQuestionService`
预设问题业务逻辑处理类
#### 公开方法:
- `list`: 获取指定智能体的预设问题列表
- `batchSave`: 批量保存智能体的预设问题
- `delete`: 删除指定的预设问题

## 类型定义 (Interfaces)
### `PresetQuestion`
**描述**: 预设问题实体接口
```typescript
export interface PresetQuestion {
  /** 问题 ID */
  id?: number;
  /** 智能体 ID */
  agentId: number;
  /** 问题内容 */
  question: string;
  /** 排序序号 */
  sortOrder?: number;
  /** 是否激活 */
  isActive?: boolean;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}
```

### `PresetQuestionDTO`
**描述**: 预设问题传输对象
```typescript
export interface PresetQuestionDTO {
  /** 问题内容 */
  question: string;
  /** 是否激活 */
  isActive?: boolean;
}
```


---
> 🤖 AI 提示: 逻辑实现请参考 `presetQuestion/index.ts`。