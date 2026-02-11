<template>
	<v-snackbar
		v-model="isVisible"
		:color="color"
		:timeout="timeout"
		:location="location"
	>
		<div class="d-flex align-center w-100">
			<v-icon v-if="icon" :icon="icon" class="me-2"></v-icon>
			<div>
				{{ message }}
			</div>
		</div>

		<template #actions>
			<v-btn icon="mdi-close" variant="text" @click="isVisible = false"></v-btn>
		</template>
	</v-snackbar>
</template>

<script setup lang="ts">
/**
 * @description 全局提示消息 (Snackbar) 组件，用于展示 Store 中的提示信息
 */

import { useTipStore } from '~/stores/tips';
import { storeToRefs } from 'pinia';

// 从 store 中获取状态
const tipStore = useTipStore();
const { isVisible, message, color, timeout, location, icon } =
	storeToRefs(tipStore);
</script>
