<script lang="ts" setup>
defineProps<{
  label: string;
  value: string | number | null;
  subtitle?: string;
  loading?: boolean;
}>();
</script>

<template>
  <div class="bg-grey-300 rounded-lg p-5 flex flex-col gap-2">
    <span class="text-100 text-grey-100 uppercase tracking-wide">{{ label }}</span>
    <div v-if="loading" class="h-8 w-20 bg-grey-200 rounded animate-pulse"></div>
    <span v-else class="text-400 font-semibold text-light">{{ value ?? "--" }}</span>
    <span v-if="subtitle" class="text-75 text-grey-50">{{ subtitle }}</span>
  </div>
</template>
