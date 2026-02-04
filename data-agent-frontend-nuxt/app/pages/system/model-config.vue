<template>
  <section class="model-config-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">模型服务配置</p>
        <h1>连接 LLM 供应商</h1>
        <p class="page-subtitle">
          配置完成后的模型可用于对话、SQL 生成及向量检索。
        </p>
      </div>
      <div class="header-actions">
        <v-btn
          rounded="xl"
          color="primary"
          class="text-none"
          prepend-icon="mdi-plus"
          @click="openCreateDialog(activeTab)"
        >
          {{ addButtonLabel }}
        </v-btn>
        <v-btn
          rounded="xl"
          variant="outlined"
          class="text-none"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="fetchConfigs"
        >
          刷新
        </v-btn>
      </div>
    </header>

    <v-card class="tabs-card" variant="flat">
      <v-tabs
        v-model="activeTab"
        class="model-tabs"
        grow
        slider-color="primary"
      >
        <v-tab value="CHAT" class="text-none text-button"
          >对话模型 (Chat)</v-tab
        >
        <v-tab value="EMBEDDING" class="text-none text-button"
          >嵌入模型 (Embedding)</v-tab
        >
      </v-tabs>
    </v-card>

    <section class="hint-banner">
      <v-icon icon="mdi-robot-happy-outline" size="20" class="mr-3"></v-icon>
      <div>
        <p class="hint-title">提示：如何选择嵌入模型？</p>
        <p class="hint-text">
          若处理大量中文知识库，推荐使用
          <strong>bge-large-zh</strong>；如需多语言兼容与服务稳定，可选择 OpenAI
          的 text-embedding 系列。
        </p>
      </div>
    </section>

    <v-skeleton-loader v-if="loading" type="card, card, card" class="mt-6" />

    <div v-else>
      <div v-if="filteredModels.length" class="model-list">
        <v-card
          v-for="model in filteredModels"
          :key="model.id"
          class="model-card"
          :class="{ 'model-card--active': model.isActive }"
          rounded="xl"
          variant="flat"
        >
          <div class="model-card__meta">
            <div class="model-icon">
              <v-icon icon="mdi-cpu-64-bit" size="24"></v-icon>
            </div>
            <div>
              <div class="model-name">
                {{ model.modelName }}
                <v-chip
                  v-if="model.isActive"
                  color="success"
                  size="small"
                  density="comfortable"
                  class="ml-2 text-none"
                >
                  默认
                </v-chip>
              </div>
              <div class="model-provider">
                PROVIDER: {{ providerLabel(model.provider) }}
                <span class="dot"></span>
                STATUS:
                <span class="status-text">STABLE</span>
              </div>
            </div>
          </div>

          <div class="model-card__details">
            <div class="detail-chip">
              <v-icon icon="mdi-web" size="16" class="mr-1"></v-icon>
              {{ model.baseUrl || "默认地址" }}
            </div>
            <div
              class="detail-chip"
              v-if="model.modelType === 'CHAT' && model.completionsPath"
            >
              <v-icon icon="mdi-api" size="16" class="mr-1"></v-icon>
              {{ model.completionsPath }}
            </div>
            <div
              class="detail-chip"
              v-if="model.modelType === 'EMBEDDING' && model.embeddingsPath"
            >
              <v-icon icon="mdi-api" size="16" class="mr-1"></v-icon>
              {{ model.embeddingsPath }}
            </div>
          </div>

          <div class="model-card__actions">
            <v-btn
              size="small"
              rounded="lg"
              variant="outlined"
              class="text-none"
              :loading="testingId === model.id"
              @click="handleTestConnection(model)"
            >
              测试连接
            </v-btn>
            <v-btn
              v-if="!model.isActive"
              size="small"
              rounded="lg"
              color="primary"
              class="text-none"
              variant="flat"
              :loading="activatingId === model.id"
              @click="handleActivate(model)"
            >
              设为默认
            </v-btn>
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              color="primary"
              @click="handleEdit(model)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              color="error"
              :loading="deletingId === model.id"
              @click="handleDelete(model)"
            />
          </div>
        </v-card>
      </div>

      <div v-else class="empty-state">
        <v-icon
          icon="mdi-robot-outline"
          size="48"
          class="mb-4 text-blue-grey-darken-1"
        ></v-icon>
        <p class="empty-title">当前分类下暂无模型实例</p>
        <p class="empty-text">点击下方按钮即可创建 {{ addButtonLabel }}</p>
        <v-btn
          color="primary"
          rounded="xl"
          prepend-icon="mdi-plus"
          class="text-none"
          @click="openCreateDialog(activeTab)"
        >
          {{ addButtonLabel }}
        </v-btn>
      </div>
    </div>

    <!-- 表单弹窗 -->
    <v-dialog v-model="dialog.visible" max-width="640" persistent>
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ dialogTitle }}</span>
          <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-form
            ref="formRef"
            v-model="formValid"
            class="model-form"
            fast-fail
          >
            <v-row dense>
              <v-col cols="12" md="6">
                <!-- 默认选择第一个 -->
                <v-select
                  v-model="form.provider"
                  :items="providerOptions"
                  label="模型提供商"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.modelType"
                  :items="modelTypeOptions"
                  label="模型类型"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="handleModelTypeChange"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.modelName"
                  label="模型名称"
                  placeholder="例如：gpt-4o, deepseek-v3"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.apiKey"
                  label="API 密钥"
                  :type="showApiKey ? 'text' : 'password'"
                  :append-inner-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showApiKey = !showApiKey"
                  :rules="form.provider === 'custom' ? [] : [rules.required]"
                  variant="outlined"
                  density="comfortable"
                  :placeholder="
                    form.provider === 'custom' ? '可选填' : '请输入 API Key'
                  "
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.baseUrl"
                  label="Base URL"
                  placeholder="请填写兼容 OpenAI 协议的基础地址"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" v-if="form.modelType === 'CHAT'">
                <v-text-field
                  v-model="form.completionsPath"
                  label="Completions 路径"
                  placeholder="默认 /v1/chat/completions"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" v-if="form.modelType === 'EMBEDDING'">
                <v-text-field
                  v-model="form.embeddingsPath"
                  label="Embeddings 路径"
                  placeholder="默认 /v1/embeddings"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" md="6">
                <div class="field-label">温度系数</div>
                <v-slider
                  v-model="form.temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  thumb-label
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="form.maxTokens"
                  type="number"
                  label="最大 Token"
                  :rules="[rules.maxTokens]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="justify-end pa-6">
          <v-btn variant="text" class="text-none" @click="closeDialog"
            >取消</v-btn
          >
          <v-btn
            color="primary"
            class="text-none"
            rounded="xl"
            :loading="saving"
            @click="handleSubmit"
          >
            {{ dialog.mode === "edit" ? "保存变更" : "创建模型" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top right"
      timeout="3000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </section>
</template>

<script setup lang="ts">
import type { VForm } from "vuetify/components";
import modelConfigService, {
  type ModelConfig,
  type ModelType,
} from "@/services/modelConfig";

const providerOptions = [
  { title: "DeepSeek", value: "deepseek" },
  { title: "Qwen", value: "qwen" },
  { title: "OpenAI", value: "openai" },
  { title: "Siliconflow", value: "siliconflow" },
  { title: "Custom Provider", value: "custom" },
];

const providerBaseUrlMap: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode",
  openai: "https://api.openai.com",
  siliconflow: "https://api.siliconflow.cn",
  custom: "",
};

const modelTypeOptions = [
  { title: "对话模型 (Chat)", value: "CHAT" },
  { title: "嵌入模型 (Embedding)", value: "EMBEDDING" },
];

const loading = ref(false);
const configs = ref<ModelConfig[]>([]);
const activeTab = ref<ModelType>("CHAT");
const testingId = ref<number | null>(null);
const activatingId = ref<number | null>(null);
const deletingId = ref<number | null>(null);
const saving = ref(false);
const showApiKey = ref(false);

const formRef = ref<VForm | null>(null);
const formValid = ref(false);
const form = reactive<ModelConfig>({
  provider: providerOptions[0]?.value || "deepseek",
  apiKey: "",
  baseUrl: providerBaseUrlMap[providerOptions[0]?.value || "deepseek"] || "",
  modelName: "",
  modelType: "CHAT",
  temperature: 0,
  maxTokens: 2000,
  completionsPath: "",
  embeddingsPath: "",
  isActive: false,
});

const dialog = reactive<{
  visible: boolean;
  mode: "create" | "edit";
  presetTab: ModelType;
}>({
  visible: false,
  mode: "create",
  presetTab: "CHAT",
});

const snackbar = reactive({
  show: false,
  text: "",
  color: "success",
});

const rules = {
  required: (value: string | number | null | undefined) =>
    value !== null && value !== undefined && value !== ""
      ? true
      : "该字段为必填项",
  maxTokens: (value: number) =>
    value >= 100 && value <= 10000 ? true : "Token 范围需在 100 - 10000 之间",
};

const dialogTitle = computed(() =>
  dialog.mode === "edit" ? "编辑模型配置" : "新增模型配置",
);

const filteredModels = computed(() =>
  configs.value.filter((model) => model.modelType === activeTab.value),
);

const addButtonLabel = computed(() =>
  activeTab.value === "CHAT" ? "添加对话模型实例" : "添加嵌入模型实例",
);

const providerLabel = (value: string) => {
  const item = providerOptions.find((option) => option.value === value);
  return item ? item.title : value;
};

const triggerSnackbar = (text: string, color: string = "success") => {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
};

const resetForm = (type: ModelType) => {
  form.provider = providerOptions[0]?.value || "deepseek";
  form.apiKey = "";
  form.baseUrl = providerBaseUrlMap[form.provider] || "";
  form.modelName = "";
  form.modelType = type;
  form.temperature = 0;
  form.maxTokens = 2000;
  form.completionsPath = "";
  form.embeddingsPath = "";
  form.isActive = false;
};

const fetchConfigs = async () => {
  loading.value = true;
  try {
    const response = await modelConfigService.list();
    console.log(response);
    configs.value = response || [];
  } catch (error) {
    triggerSnackbar("获取模型配置失败，请稍后重试", "error");
    configs.value = [];
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = (type: ModelType) => {
  dialog.mode = "create";
  dialog.visible = true;
  dialog.presetTab = type;
  resetForm(type);
};

const handleEdit = (model: ModelConfig) => {
  dialog.mode = "edit";
  dialog.visible = true;
  dialog.presetTab = model.modelType;
  Object.assign(form, model);
};

const closeDialog = () => {
  dialog.visible = false;
  showApiKey.value = false;
};

const submitConfig = async (isUpdate: boolean) => {
  saving.value = true;
  try {
    let result;
    if (isUpdate) {
      result = await modelConfigService.update(form);
    } else {
      result = await modelConfigService.add(form);
    }

    if (result.success) {
      triggerSnackbar(isUpdate ? "配置更新成功" : "配置创建成功", "success");
      closeDialog();
      fetchConfigs();
    } else {
      triggerSnackbar(result.message || "操作失败，请重试", "error");
    }
  } catch (error) {
    triggerSnackbar("请求失败，请检查网络", "error");
  } finally {
    saving.value = false;
  }
};

const handleSubmit = async () => {
  const validateResult = await formRef.value?.validate();
  if (!validateResult?.valid) return;
  await submitConfig(dialog.mode === "edit");
};

const handleDelete = async (model: ModelConfig) => {
  if (!model.id) return;
  const confirmDelete = window.confirm(
    `确定要删除 ${model.modelName} 吗？此操作不可撤销。`,
  );
  if (!confirmDelete) return;
  deletingId.value = model.id;
  try {
    const result = await modelConfigService.delete(model.id);
    if (result.success) {
      triggerSnackbar("模型已删除", "success");
      fetchConfigs();
    } else {
      triggerSnackbar(result.message || "删除失败", "error");
    }
  } catch (error) {
    triggerSnackbar("删除失败，请检查网络", "error");
  } finally {
    deletingId.value = null;
  }
};

const handleActivate = async (model: ModelConfig) => {
  if (!model.id) return;
  if (
    model.modelType === "EMBEDDING" &&
    !window.confirm("切换嵌入模型会导致现有向量数据失效，确定继续吗？")
  ) {
    return;
  }

  activatingId.value = model.id;
  try {
    const result = await modelConfigService.activate(model.id);
    if (result.success) {
      triggerSnackbar("已设置为默认模型", "success");
      fetchConfigs();
    } else {
      triggerSnackbar(result.message || "设置失败", "error");
    }
  } catch (error) {
    triggerSnackbar("操作失败，请检查网络", "error");
  } finally {
    activatingId.value = null;
  }
};

const handleTestConnection = async (model: ModelConfig) => {
  testingId.value = model.id ?? null;
  try {
    const result = await modelConfigService.testConnection(model);
    if (result.success) {
      triggerSnackbar(result.message || "连接测试成功", "success");
    } else {
      triggerSnackbar(result.message || "连接测试失败", "error");
    }
  } catch (error) {
    triggerSnackbar("连接测试失败，请检查网络", "error");
  } finally {
    testingId.value = null;
  }
};

const handleModelTypeChange = (type: ModelType) => {
  if (type === "CHAT") {
    form.embeddingsPath = "";
  } else {
    form.completionsPath = "";
  }
};

const watchProviderChange = (value: string) => {
  if (value && value !== "custom") {
    form.baseUrl = providerBaseUrlMap[value] || "";
  }
};

watch(
  () => form.provider,
  (value) => watchProviderChange(value),
);

onMounted(fetchConfigs);
</script>

<style scoped>
.model-config-page {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.page-eyebrow {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 8px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #475569;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tabs-card {
  border-radius: 24px;
  padding: 8px;
  background: #e2e8f0;
}

.hint-banner {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #475569;
}

.hint-title {
  margin: 0;
  font-weight: 600;
  color: #0f172a;
}

.hint-text {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.4;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.model-card {
  padding: 20px;
  border-radius: 28px;
  border: 2px solid transparent;
  background: #fff;
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 16px;
}

.model-card--active {
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.15);
}

.model-card__meta {
  display: flex;
  gap: 16px;
  align-items: center;
}

.model-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-name {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
}

.model-provider {
  font-size: 12px;
  text-transform: uppercase;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #cbd5f5;
  display: inline-block;
}

.status-text {
  color: #10b981;
  font-weight: 600;
}

.model-card__details {
  grid-column: span 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f8fafc;
  font-size: 12px;
  color: #475569;
}

.model-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.empty-state {
  margin-top: 32px;
  padding: 48px 24px;
  border-radius: 32px;
  border: 1px dashed #cbd5f5;
  text-align: center;
  background: #fff;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.empty-text {
  margin-bottom: 16px;
  color: #64748b;
}

.model-form {
  margin-top: 8px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

@media (max-width: 1024px) {
  .model-card {
    grid-template-columns: 1fr;
  }

  .model-card__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .model-config-page {
    padding: 16px;
  }
}
</style>
