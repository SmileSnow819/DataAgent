# 逻辑模块: resultSet

## 模块描述
结果集数据结构定义，用于统一处理表格、图表等展示数据

## 类型定义 (Interfaces)
### `ResultData`
**描述**: 结果集数据结构定义，用于统一处理表格、图表等展示数据
```typescript
export interface ResultData {
  /** 显示样式配置 */
  displayStyle?: ResultDisplayStyleBO;
  /** 结果集数据 */
  resultSet: ResultSetData;
}
```

### `ResultDisplayStyleBO`
**描述**: 结果显示样式业务对象
```typescript
export interface ResultDisplayStyleBO {
  /** 图表类型 (如 bar, line, table) */
  type: string;
  /** 标题 */
  title: string;
  /** X 轴字段名 */
  x: string;
  /** Y 轴字段名列表 */
  y: Array<string>;
}
```

### `ResultSetData`
**描述**: 结果集核心数据结构
```typescript
export interface ResultSetData {
  /** 列名列表 */
  column: string[];
  /** 数据行列表，每行为字段名到值的映射 */
  data: Array<Record<string, string>>;
  /** 错误信息 */
  errorMsg?: string;
}
```

### `PaginationConfig`
**描述**: 分页配置接口
```typescript
export interface PaginationConfig {
  /** 当前页码 */
  currentPage: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
}
```

### `ResultSetDisplayConfig`
**描述**: 结果集显示配置接口
```typescript
export interface ResultSetDisplayConfig {
  /** 是否显示 SQL 执行结果 */
  showSqlResults: boolean;
  /** 默认每页条数 */
  pageSize: number;
}
```


---
> 🤖 AI 提示: 逻辑实现请参考 `resultSet/index.ts`。