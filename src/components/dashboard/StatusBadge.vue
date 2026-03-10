<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{ success: boolean | null }>();

const label = computed(() => {
  if (props.success === true) return "Success";
  if (props.success === false) return "Failed";
  return "Pending";
});

const classes = computed(() => {
  if (props.success === true) return "bg-badge-info text-accent-100";
  if (props.success === false) return "bg-badge-fail text-neg-200";
  return "bg-badge-plain text-grey-50";
});
</script>

<template>
  <span class="inline-flex text-75 font-medium px-2 py-0.5 rounded-full" :class="classes">
    {{ label }}
  </span>
</template>
