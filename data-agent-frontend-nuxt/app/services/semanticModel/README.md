# 逻辑模块: semanticModel

## 模块描述
语义模型管理服务，处理库表字段的业务映射、批量导入导出及状态管理

## 类 (Classes)
### Class: `SemanticModelService`
语义模型业务逻辑处理类
#### 公开方法:
- `list`: 获取语义模型列表
- `get`: 根据 ID 获取语义模型详情
- `create`: 创建新语义模型
- `update`: 更新语义模型信息
- `delete`: 删除指定语义模型
- `batchDelete`: 批量删除语义模型
- `enable`: 批量启用语义模型
- `disable`: 批量禁用语义模型
- `batchImport`: 批量导入语义模型
- `importExcel`: 通过 Excel 文件导入语义模型
- `downloadTemplate`: 下载语义模型导入模板 Excel

## 类型定义 (Interfaces)
### `SemanticModel`
**描述**: 语义模型实体接口
```typescript
export interface SemanticModel {
  /** 模型 ID */
  id?: number;
  /** 关联的智能体 ID */
  agentId: number;
  /** 关联的数据源 ID */
  datasourceId?: number;
  /** 数据库表名 */
  tableName: string;
  /** 数据库列名 */
  columnName: string;
  /** 业务名称 */
  businessName: string;
  /** 同义词 */
  synonyms: string;
  /** 业务描述 */
  businessDescription: string;
  /** 数据库列注释 */
  columnComment: string;
  /** 数据类型 */
  dataType: string;
  /** 状态 (0: 禁用, 1: 启用) */
  status: number;
  /** 创建时间 */
  createdTime?: string;
  /** 更新时间 */
  updateTime?: string;
}
```

### `SemanticModelAddDto`
**描述**: 创建语义模型的 DTO
```typescript
export interface SemanticModelAddDto {
  /** 智能体 ID */
  agentId: number;
  /** 表名 */
  tableName: string;
  /** 列名 */
  columnName: string;
  /** 业务名称 */
  businessName: string;
  /** 同义词 */
  synonyms: string;
  /** 业务描述 */
  businessDescription: string;
  /** 列注释 */
  columnComment: string;
  /** 数据类型 */
  dataType: string;
}
```

### `SemanticModelImportItem`
**描述**: 语义模型导入项接口
```typescript
export interface SemanticModelImportItem {
  /** 表名 */
  tableName: string;
  /** 列名 */
  columnName: string;
  /** 业务名称 */
  businessName: string;
  /** 同义词 */
  synonyms?: string;
  /** 业务描述 */
  businessDescription?: string;
  /** 列注释 */
  columnComment?: string;
  /** 数据类型 */
  dataType: string;
}
```

### `SemanticModelBatchImportDTO`
**描述**: 批量导入语义模型的 DTO
```typescript
export interface SemanticModelBatchImportDTO {
  /** 智能体 ID */
  agentId: number;
  /** 导入项列表 */
  items: SemanticModelImportItem[];
}
```

### `BatchImportResult`
**描述**: 批量导入结果接口
```typescript
export interface BatchImportResult {
  /** 总条数 */
  total: number;
  /** 成功条数 */
  successCount: number;
  /** 失败条数 */
  failCount: number;
  /** 错误信息列表 */
  errors: string[];
}
```


---
> 🤖 AI 提示: 逻辑实现请参考 `semanticModel/index.ts`。