/*
 * Copyright 2024-2025 the original author or authors.
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

import { $fetch } from 'ofetch';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Datasource {
  id?: number;
  name?: string;
  type?: string;
  host?: string;
  port?: number;
  databaseName?: string;
  schemaName?: string;
  username?: string;
  password?: string;
  connectionUrl?: string;
  status?: string;
  testStatus?: string;
  description?: string;
  creatorId?: number;
  createTime?: string;
  updateTime?: string;
}

export interface LogicalRelation {
  id?: number;
  datasourceId?: number;
  sourceTableName: string;
  sourceColumnName: string;
  targetTableName: string;
  targetColumnName: string;
  relationType: string; // '1:1', '1:N', 'N:1'
  description?: string;
}

export interface CreateLogicalRelationDTO {
  sourceTableName: string;
  sourceColumnName: string;
  targetTableName: string;
  targetColumnName: string;
  relationType: string;
  description?: string;
}

const API_BASE_URL = '/api/datasource';

class DatasourceService {
  // 1. 获取所有数据源列表
  async getAllDatasource(status?: string, type?: string): Promise<Datasource[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);

    return await $fetch<Datasource[]>(
      `${API_BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`
    );
  }

  // 2. 根据 ID 获取数据源详情
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

  // 3. 获取数据源的表列表
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

  // 3.1 获取数据源表的字段列表
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

  // 4. 创建数据源
  async createDatasource(datasource: Datasource): Promise<Datasource> {
    return await $fetch<Datasource>(API_BASE_URL, {
      method: 'POST',
      body: datasource,
    });
  }

  // 5. 更新数据源
  async updateDatasource(id: number, datasource: Datasource): Promise<Datasource> {
    return await $fetch<Datasource>(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      body: datasource,
    });
  }

  // 6. 删除数据源
  async deleteDatasource(id: number): Promise<ApiResponse<void>> {
    return await $fetch<ApiResponse<void>>(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // 7. 测试数据源连接
  async testConnection(id: number): Promise<ApiResponse<boolean>> {
    return await $fetch<ApiResponse<boolean>>(`${API_BASE_URL}/${id}/test`, {
      method: 'POST',
    });
  }

  // 8. 获取逻辑外键列表
  async getLogicalRelations(id: number): Promise<ApiResponse<LogicalRelation[]>> {
    return await $fetch<ApiResponse<LogicalRelation[]>>(`${API_BASE_URL}/${id}/logical-relations`);
  }

  // 9. 添加逻辑外键
  async addLogicalRelation(id: number, dto: CreateLogicalRelationDTO): Promise<ApiResponse<LogicalRelation>> {
    return await $fetch<ApiResponse<LogicalRelation>>(`${API_BASE_URL}/${id}/logical-relations`, {
      method: 'POST',
      body: dto,
    });
  }

  // 10. 删除逻辑外键
  async deleteLogicalRelation(datasourceId: number, relationId: number): Promise<ApiResponse<void>> {
    return await $fetch<ApiResponse<void>>(`${API_BASE_URL}/${datasourceId}/logical-relations/${relationId}`, {
      method: 'DELETE',
    });
  }
}

export default new DatasourceService();
