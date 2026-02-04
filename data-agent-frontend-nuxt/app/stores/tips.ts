import type { Anchor } from 'vuetify';

export const useTipStore = defineStore('toast', () => {
	// 定义消息状态
	const isVisible = ref(false);
	const message = ref('');
	const color = ref('success');
	const timeout = ref(3000);
	const location = ref<Anchor>('top');
	const icon = ref('');

	// 显示消息的动作
	function show(
		msg: string,
		options: {
			color?: string;
			timeout?: number;
			location?: Anchor;
			icon?: string;
		} = {},
	) {
		// 确保只在客户端运行
		if (import.meta.client) {
			message.value = msg;
			color.value = options.color || 'success';
			timeout.value = options.timeout || 3000;
			location.value = options.location || 'top';
			icon.value = options.icon || 'mdi-check';
			isVisible.value = true;
		}
		// 如果在服务器端调用，则不执行任何操作
	}

	// 隐藏消息的动作
	function hide() {
		isVisible.value = false;
	}

	return { isVisible, message, color, timeout, location, icon, show, hide };
});
