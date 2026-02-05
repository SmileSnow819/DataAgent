import { $fetch } from 'ofetch';

export interface PromptConfig {
  id?: number;
  name: string;
  description?: string;
  optimizationPrompt: string;
  priority?: number;
  displayOrder?: number;
  enabled?: boolean;
  promptType: string;
  agentId?: number | null;
  creator?: string;
}

export interface PromptConfigResponse {
  success: boolean;
  message?: string;
  data?: PromptConfig[] | PromptConfig;
}

const API_BASE_URL = '/api/prompt-config';

class PromptService {
  /**
   * 加载优化配置列表
   */
  async listByType(promptType: string, agentId?: string | number): Promise<PromptConfig[]> {
    const query = agentId ? `?agentId=${agentId}` : '';
    const response = await $fetch<PromptConfigResponse>(
      `${API_BASE_URL}/list-by-type/${promptType}${query}`
    );
    return (response.data as PromptConfig[]) || [];
  }

  /**
   * 保存配置
   */
  async save(config: PromptConfig): Promise<PromptConfigResponse> {
    return await $fetch<PromptConfigResponse>(`${API_BASE_URL}/save`, {
      method: 'POST',
      body: config,
    });
  }

  /**
   * 启用配置
   */
  async enable(id: number): Promise<PromptConfigResponse> {
    return await $fetch<PromptConfigResponse>(`${API_BASE_URL}/${id}/enable`, {
      method: 'POST',
    });
  }

  /**
   * 禁用配置
   */
  async disable(id: number): Promise<PromptConfigResponse> {
    return await $fetch<PromptConfigResponse>(`${API_BASE_URL}/${id}/disable`, {
      method: 'POST',
    });
  }

  /**
   * 删除配置
   */
  async delete(id: number): Promise<PromptConfigResponse> {
    return await $fetch<PromptConfigResponse>(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * 批量启用
   */
  async batchEnable(ids: number[]): Promise<PromptConfigResponse> {
    return await $fetch<PromptConfigResponse>(`${API_BASE_URL}/batch-enable`, {
      method: 'POST',
      body: ids,
    });
  }

  /**
   * 批量禁用
   */
  async batchDisable(ids: number[]): Promise<PromptConfigResponse> {
    return await $fetch<PromptConfigResponse>(`${API_BASE_URL}/batch-disable`, {
      method: 'POST',
      body: ids,
    });
  }

  /**
   * 更新优先级
   */
  async updatePriority(id: number, priority: number): Promise<PromptConfigResponse> {
    return await $fetch<PromptConfigResponse>(`${API_BASE_URL}/${id}/priority`, {
      method: 'POST',
      body: { priority },
    });
  }
}

export const promptService = new PromptService();
