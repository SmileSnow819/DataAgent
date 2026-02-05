<template>
	<v-app id="app">
		<v-main>
			<BaseDrawer v-model="drawer" :drawer-width="260">
				<!-- 侧边栏内容 -->
				<template #drawer>
					<div class="d-flex flex-column h-100">
						<!-- Logo Area -->
						<div class="d-flex align-center pa-4 border-b border-white-5">
							<v-avatar color="primary" size="32" class="mr-3 rounded-lg">
								<v-icon icon="mdi-robot" color="white" size="20"></v-icon>
							</v-avatar>
							<div>
								<div class="text-subtitle-2 font-weight-bold text-white">
									Spring AI Alibaba
								</div>
								<div
									class="text-caption text-blue-lighten-3 font-weight-bold"
									style="font-size: 10px; letter-spacing: 1px"
								>
									DATA AGENT
								</div>
							</div>
						</div>

						<!-- 导航 -->
						<v-list
							density="compact"
							nav
							class="flex-grow-1 pa-2 px-4 custom-scrollbar bg-transparent"
							theme="dark"
						>
							<!-- 核心业务 -->
							<v-list-item
								prepend-icon="mdi-chat-processing-outline"
								title="数据问答"
								:active="isActive('/chat')"
								class="rounded-lg mb-1 navigation-item"
								color="primary"
								@click="navigateToPath('/chat')"
							/>
							<v-list-item
								prepend-icon="mdi-chart-box-outline"
								:active="isActive('/dashboard')"
								class="rounded-lg mb-1 navigation-item"
								color="primary"
								title="数据看板"
								@click="navigateToPath('/dashboard')"
							/>
							<v-list-item
								prepend-icon="mdi-auto-fix"
								:active="isActive('/prompt-config')"
								class="rounded-lg mb-1 navigation-item"
								color="primary"
								title="提示词配置"
								@click="navigateToPath('/prompt-config')"
							/>

							<!-- 知识库管理 (可折叠) -->
							<v-list-group value="knowledge">
								<template #activator="{ props }">
									<v-list-item
										v-bind="props"
										title="知识库管理"
										class="text-overline text-slate-500 mt-4"
									/>
								</template>
								<v-list-item
									prepend-icon="mdi-book-open-variant"
									title="业务知识配置"
									:active="isActive('/knowledge/business')"
									density="compact"
									class="rounded-lg mb-1 navigation-sub-item"
									@click="navigateToPath('/knowledge/business')"
								/>
								<v-list-item
									prepend-icon="mdi-brain"
									title="智能体知识库"
									:active="isActive('/knowledge/agents')"
									density="compact"
									class="rounded-lg mb-1 navigation-sub-item"
									@click="navigateToPath('/knowledge/agents')"
								/>
								<v-list-item
									prepend-icon="mdi-vector-intersection"
									title="语义模型配置"
									:active="isActive('/knowledge/semantic-models')"
									density="compact"
									class="rounded-lg mb-1 navigation-sub-item"
									@click="navigateToPath('/knowledge/semantic-models')"
								/>
							</v-list-group>

							<!-- 系统管理 (可折叠) -->
							<v-list-group value="system">
								<template #activator="{ props }">
									<v-list-item
										v-bind="props"
										title="系统管理"
										class="text-overline text-slate-500 mt-2"
									/>
								</template>
								<v-list-item
									prepend-icon="mdi-database-refresh-outline"
									title="数据连接"
									:active="isActive('/system/data-sources')"
									density="compact"
									class="rounded-lg mb-1 navigation-sub-item"
									@click="navigateToPath('/system/data-sources')"
								/>
								<v-list-item
									prepend-icon="mdi-cpu-64-bit"
									title="模型配置"
									:active="isActive('/system/models')"
									density="compact"
									class="rounded-lg mb-1 navigation-sub-item"
									@click="navigateToPath('/system/model-config')"
								/>
								<v-list-item
									prepend-icon="mdi-cog-outline"
									title="通用设置"
									:active="isActive('/system/settings')"
									density="compact"
									class="rounded-lg mb-1 navigation-sub-item"
									@click="navigateToPath('/system/settings')"
								/>
							</v-list-group>

							<!-- 新建智能体 分组 -->
							<div class="mt-6 pt-4 border-t border-white/5">
								<v-list-item
									:active="isActive('/agents/new')"
									variant="flat"
									class="rounded-xl mx-2 shadow-lg bg-blue-grey-darken-4"
									color="white"
									@click="navigateToPath('/agents/new')"
								>
									<template #prepend
										><v-icon icon="mdi-plus-box-outline" class="mr-3"></v-icon
									></template>
									<v-list-item-title class="font-weight-bold text-caption"
										>新建智能体</v-list-item-title
									>
								</v-list-item>
							</div>
						</v-list>

						<!-- 底部用户信息 -->
						<div class="pa-4 border-t border-white/5">
							<v-btn
								block
								variant="text"
								color="red-lighten-2"
								class="text-none justify-start px-2 d-flex align-center"
								@click="logout"
							>
								<template #prepend>
									<v-avatar size="24" color="grey-darken-3" class="mr-2"
										><v-icon icon="mdi-account" size="14"></v-icon
									></v-avatar>
								</template>
								<div class="text-caption font-weight-bold">root</div>
								<v-spacer></v-spacer>
								<v-icon icon="mdi-logout" size="16"></v-icon>
							</v-btn>
						</div>
					</div>
				</template>

				<!-- Header Area with Toggle -->
				<template #header="{ toggle, isOpen }">
					<v-btn icon variant="text" size="small" class="mr-2" @click="toggle">
						<v-icon :icon="isOpen ? 'mdi-menu-open' : 'mdi-menu'"></v-icon>
					</v-btn>
					<div class="text-subtitle-1 font-weight-medium text-grey-darken-3">
						{{ currentRouteTitle }}
					</div>
					<v-spacer></v-spacer>
					<div class="d-flex align-center gap-2">
						<v-chip
							size="small"
							variant="outlined"
							color="primary"
							class="font-weight-bold"
							>Alibaba Edition</v-chip
						>
					</div>
				</template>

				<!-- Main Content -->
				<slot />
			</BaseDrawer>
		</v-main>
		<!-- 全局组件-->
		<ConfirmDialog
			v-model="dialogState.isVisible"
			:title="dialogState.title"
			:message="dialogState.message"
			:prepend-icon="dialogState.icon"
			:confirm-text="dialogState.confirmText"
			@confirm="handleGlobalConfirm"
		/>
		<Tip></Tip>
	</v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseDrawer from '../components/BaseDrawer.vue';
const { dialogState, handleGlobalConfirm } = useConfirm();

const drawer = ref(true);
const router = useRouter();
const route = useRoute();

const routeTitleMap: Record<string, string> = {
	'/chat': '数据问答',
	'/dashboard': '数据看板',
	'/prompt-config': '提示词配置',
	'/knowledge/business': '业务知识配置',
	'/knowledge/agents': '智能体知识库',
	'/knowledge/semantic-models': '语义模型配置',
	'/system/data-sources': '数据连接',
	'/system/model-config': '模型配置',
	'/system/settings': '通用设置',
	'/agents/new': '新建智能体任务',
};

const navigateToPath = (path: string) => {
	if (route.path !== path) {
		router.push(path);
	}
};

const isActive = (path: string) => route.path === path;

const currentRouteTitle = computed(
	() => routeTitleMap[route.path] || 'Data Agent',
);

const logout = () => {
	console.log('logout');
};
</script>

<style scoped>
.border-white-5 {
	border-color: rgba(255, 255, 255, 0.05) !important;
}

.navigation-item {
	--v-list-item-padding-start: 16px;
}

.navigation-sub-item {
	--v-list-item-padding-start: 28px;
}

.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.1);
	border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.2);
}

/* 针对 list-group 内部的 item 强制修改缩进 */
:deep(.v-list-group__items .v-list-item) {
	padding-inline-start: 16px !important; /* 原本可能是 48px 或 64px */
}

/* 如果是想让图标和文字更靠近 */
:deep(.v-list-item__spacer) {
	width: 12px !important; /* 缩短图标和文字之间的距离 */
}
</style>
