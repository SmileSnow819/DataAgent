/**
 * @description 数据源管理服务，处理基础数据源的增删改查、连接测试及逻辑外键管理
 */

import { $fetch } from 'ofetch';

/**
 * @description 通用 API 响应结构
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 提示消息 */
  message?: string;
  /** 返回数据 */
  data?: T;
}

/**
 * @description 数据源实体接口
 */
export interface Datasource {
  /** 数据源 ID */
  id?: number;
  /** 数据源名称 */
  name?: string;
  /** 数据源类型 (如 MySQL, PostgreSQL) */
  type?: string;
  /** 主机地址 */
  host?: string;
  /** 端口号 */
  port?: number;
  /** 数据库名称 */
  databaseName?: string;
  /** Schema 名称 */
  schemaName?: string;
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
  /** 连接 URL */
  connectionUrl?: string;
  /** 状态 */
  status?: string;
  /** 测试连接状态 */
  testStatus?: string;
  /** 描述 */
  description?: string;
  /** 创建者 ID */
  creatorId?: number;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}

/**
 * @description 逻辑外键关系实体接口
 */
export interface LogicalRelation {
  /** 关系 ID */
  id?: number;
  /** 数据源 ID */
  datasourceId?: number;
  /** 源表名 */
  sourceTableName: string;
  /** 源列名 */
  sourceColumnName: string;
  /** 目标表名 */
  targetTableName: string;
  /** 目标列名 */
  targetColumnName: string;
  /** 关系类型 (1:1, 1:N, N:1) */
  relationType: string;
  /** 描述 */
  description?: string;
}

/**
 * @description 创建逻辑外键关系的 DTO
 */
export interface CreateLogicalRelationDTO {
  /** 源表名 */
  sourceTableName: string;
  /** 源列名 */
  sourceColumnName: string;
  /** 目标表名 */
  targetTableName: string;
  /** 目标列名 */
  targetColumnName: string;
  /** 关系类型 */
  relationType: string;
  /** 描述 */
  description?: string;
}

const API_BASE_URL = '/api/datasource';

/**
 * @description 数据源业务逻辑处理类
 */
class DatasourceService {
  /**
   * @description 获取所有数据源列表
   * @param {string} [status] - 状态筛选
   * @param {string} [type] - 类型筛选
   * @returns {Promise<Datasource[]>} 数据源列表
   */
  async getAllDatasource(status?: string, type?: string): Promise<Datasource[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);

    return await $fetch<Datasource[]>(
      `${API_BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`
    );
  }

  /**
   * @description 根据 ID 获取数据源详情
   * @param {number} id - 数据源 ID
   * @returns {Promise<Datasource | null>} 数据源详情
   */
  async getDatasourceById(id: number): Promise<Datasource | null> {
    try {
      return await $fetch<Datasource>(`${API_BASE_URL}/${id}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * @description 获取数据源下的所有表名
   * @param {number} id - 数据源 ID
   * @returns {Promise<string[]>} 表名列表
   */
  async getDatasourceTables(id: number): Promise<string[]> {
    try {
      return await $fetch<string[]>(`${API_BASE_URL}/${id}/tables`);
    } catch (error: any) {
      if (error.statusCode === 400) {
        return [];
      }
      throw error;
    }
  }

  /**
   * @description 获取指定表的列名列表
   * @param {number} datasourceId - 数据源 ID
   * @param {string} tableName - 表名
   * @returns {Promise<string[]>} 列名列表
   */
  async getTableColumns(datasourceId: number, tableName: string): Promise<string[]> {
    try {
      const res = await $fetch<ApiResponse<string[]>>(
        `${API_BASE_URL}/${datasourceId}/tables/${encodeURIComponent(tableName)}/columns`
      );
      return res.data ?? [];
    } catch {
      return [];
    }
  }

  /**
   * @description 创建新数据源
   * @param {Datasource} datasource - 数据源信息
   * @returns {Promise<Datasource>} 创建成功的数据源详情
   */
  async createDatasource(datasource: Datasource): Promise<Datasource> {
    return await $fetch<Datasource>(API_BASE_URL, {
      method: 'POST',
      body: datasource,
    });
  }

  /**
   * @description 更新数据源信息
   * @param {number} id - 数据源 ID
   * @param {Datasource} datasource - 更新的字段
   * @returns {Promise<Datasource>} 更新后的数据源详情
   */
  async updateDatasource(id: number, datasource: Datasource): Promise<Datasource> {
    return await $fetch<Datasource>(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      body: datasource,
    });
  }

  /**
   * @description 删除指定数据源
   * @param {number} id - 数据源 ID
   * @returns {Promise<ApiResponse<void>>} 操作结果
   */
  async deleteDatasource(id: number): Promise<ApiResponse<void>> {
    return await $fetch<ApiResponse<void>>(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * @description 测试数据源连接是否正常
   * @param {number} id - 数据源 ID
   * @returns {Promise<ApiResponse<boolean>>} 测试结果
   */
  async testConnection(id: number): Promise<ApiResponse<boolean>> {
    return await $fetch<ApiResponse<boolean>>(`${API_BASE_URL}/${id}/test`, {
      method: 'POST',
    });
  }

  /**
   * @description 获取数据源的逻辑外键列表
   * @param {number} id - 数据源 ID
   * @returns {Promise<ApiResponse<LogicalRelation[]>>} 逻辑外键列表
   */
  async getLogicalRelations(id: number): Promise<ApiResponse<LogicalRelation[]>> {
    return await $fetch<ApiResponse<LogicalRelation[]>>(`${API_BASE_URL}/${id}/logical-relations`);
  }

  /**
   * @description 为数据源添加逻辑外键关系
   * @param {number} id - 数据源 ID
   * @param {CreateLogicalRelationDTO} dto - 关系配置
   * @returns {Promise<ApiResponse<LogicalRelation>>} 创建成功的关系详情
   */
  async addLogicalRelation(id: number, dto: CreateLogicalRelationDTO): Promise<ApiResponse<LogicalRelation>> {
    return await $fetch<ApiResponse<LogicalRelation>>(`${API_BASE_URL}/${id}/logical-relations`, {
      method: 'POST',
      body: dto,
    });
  }

  /**
   * @description 删除逻辑外键关系
   * @param {number} datasourceId - 数据源 ID
   * @param {number} relationId - 关系 ID
   * @returns {Promise<ApiResponse<void>>} 操作结果
   */
  async deleteLogicalRelation(datasourceId: number, relationId: number): Promise<ApiResponse<void>> {
    return await $fetch<ApiResponse<void>>(`${API_BASE_URL}/${datasourceId}/logical-relations/${relationId}`, {
      method: 'DELETE',
    });
  }
}

export default new DatasourceService();
