// 定义对话框需要的所有状态和回调
interface ConfirmState {
	isVisible: boolean;
	title: string;
	message: string;
	icon: string;
	confirmText: string;
	onConfirm: () => void;
}

// 默认状态
const defaultState: ConfirmState = {
	isVisible: false,
	title: '',
	message: '',
	icon: 'mdi-help-circle',
	confirmText: '确认',
	onConfirm: () => {}, // 默认是一个空函数
};

// 集中式的响应式状态对象
const dialogState = reactive<ConfirmState>({ ...defaultState });

/**
 * 显示确认对话框
 * @param options - 包含对话框内容和确认回调的选项
 */
export function showConfirm(options: Partial<Omit<ConfirmState, 'isVisible'>>) {
	// 1. 重置并更新状态
	Object.assign(dialogState, defaultState, options, { isVisible: true });
}

/**
 * 对话框内部触发确认动作时调用
 */
export function handleGlobalConfirm() {
	dialogState.onConfirm(); // 执行传入的回调函数
	dialogState.isVisible = false; // 自动关闭对话框
}

/**
 * 隐藏对话框
 */
export function hideConfirm() {
	dialogState.isVisible = false;
}

/**
 * 提供给 Layout 绑定到 <ConfirmDialog> 的 Composition Function
 */
export function useConfirm() {
	return {
		dialogState,
		handleGlobalConfirm,
		hideConfirm,
		showConfirm, // 尽管 showConfirm 主要被其他组件调用
	};
}
