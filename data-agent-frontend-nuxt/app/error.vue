<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps({
  error: Object as () => NuxtError,
});
</script>

<template>
  <div>
    <h1>{{ error?.statusText }}</h1>
    <NuxtLink to="/">返回首页</NuxtLink>
  </div>
</template>
