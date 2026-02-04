import { useTipStore } from '@/stores/tips';

export default defineNuxtPlugin(() => {
	const tipStore = useTipStore();

	return {
		provide: {
			tip: tipStore.show,
		},
	};
});
