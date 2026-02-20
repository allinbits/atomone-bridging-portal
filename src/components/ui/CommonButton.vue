<script lang="ts" setup>
const props = defineProps<{ disabled?: boolean }>();
</script>

<template>
  <button
    :disabled="props.disabled"
    class="px-6 py-4 rounded-md text-200 font-medium"
    :class="
      props.disabled
        ? ['bg-grey-200', 'text-grey-100', 'hover:cursor-auto']
        : ['bg-grey-200', 'text-light', 'hover:text-grey-500', 'hover:bg-light', 'hover:cursor-pointer']
    "
  >
    <slot></slot>
  </button>
</template>
