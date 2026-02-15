# 逻辑模块: common

## 模块描述
通用 API 响应结构定义

## 类型定义 (Interfaces)
### `ApiResponse`
**描述**: 通用 API 响应结构定义
```typescript
export interface ApiResponse<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 提示消息 */
  message: string;
  /** 返回数据 */
  data?: T;
}
```

### `PageResponse`
**描述**: 分页 API 响应接口
```typescript
export interface PageResponse<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 提示消息 */
  message: string;
  /** 数据列表 */
  data: T;
  /** 总条数 */
  total: number;
  /** 当前页码 */
  pageNum: number;
  /** 每页条数 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}
```


---
> 🤖 AI 提示: 逻辑实现请参考 `common/index.ts`。