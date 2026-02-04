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
withDefaults(
	defineProps<{
		modelValue: boolean;
		title: string;
		message: string;
		prependIcon?: string;
		confirmText?: string;
	}>(),
	//default
	{
		prependIcon: 'mdi-help-circle',
		confirmText: '确认',
	},
);

defineEmits(['update:modelValue', 'confirm']);
</script>
