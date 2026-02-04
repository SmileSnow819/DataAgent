<template>
  <div class="base-drawer" :style="cssVars">
    <aside 
      class="base-drawer__left" 
      :class="{ 'base-drawer__left--closed': !modelValue }"
    >
      <slot name="drawer" />
    </aside>
    
    <section class="base-drawer__right">
      <header v-if="$slots.header" class="base-drawer__header">
        <slot name="header" :toggle="toggle" :is-open="modelValue" />
      </header>
      <div class="base-drawer__content">
        <slot />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  drawerWidth?: number | string;
  modelValue?: boolean;
}>(), {
  drawerWidth: 260,
  modelValue: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const toggle = () => {
  emit('update:modelValue', !props.modelValue);
};

const normalizedDrawerWidth = computed(() => {
  const width = props.drawerWidth;
  return typeof width === 'number' ? `${width}px` : width;
});

const cssVars = computed(() => ({
  '--drawer-width': normalizedDrawerWidth.value,
}));
</script>

<style scoped>
.base-drawer {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f8fafc;
}

.base-drawer__left {
  width: var(--drawer-width);
  height: 100%;
  background-color: #0d1117;
  color: #e2e8f0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  white-space: nowrap;
}

.base-drawer__left--closed {
  width: 0;
}

.base-drawer__right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevent flex child overflow */
  height: 100%;
}

.base-drawer__header {
  height: 56px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 16px;
  flex-shrink: 0;
}

.base-drawer__content {
  flex: 1;
  overflow: auto;
  position: relative;
}
</style>
