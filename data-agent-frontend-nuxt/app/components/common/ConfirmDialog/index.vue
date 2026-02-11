<template>
	<v-dialog
		:model-value="modelValue"
		max-width="400"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<v-card :prepend-icon="prependIcon" :title="title">
			<v-card-text style="white-space: pre-line">{{ message }}</v-card-text>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn
					text="取消"
					variant="plain"
					@click="$emit('update:modelValue', false)"
				></v-btn>
				<!-- 子组件传入事件 -->
				<v-btn
					color="primary"
					:text="confirmText"
					variant="tonal"
					@click="
						$emit('confirm');
						$emit('update:modelValue', false);
					"
				></v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
/**
 * @description 通用确认对话框组件，用于二次确认操作
 */

interface Props {
	/** 是否显示对话框 */
	modelValue: boolean;
	/** 对话框标题 */
	title: string;
	/** 提示消息内容 */
	message: string;
	/** 标题前的图标 */
	prependIcon?: string;
	/** 确认按钮的文字 */
	confirmText?: string;
}

withDefaults(defineProps<Props>(), {
	prependIcon: 'mdi-help-circle',
	confirmText: '确认',
});

defineEmits<{
	/** 更新显示状态 */
	'update:modelValue': [value: boolean];
	/** 点击确认按钮事件 */
	confirm: [];
}>();
</script>
