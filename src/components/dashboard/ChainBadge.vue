<script lang="ts" setup>
import { computed } from "vue";

import { CHAIN_DISPLAY } from "@/union/dashboard-graphql";

const props = defineProps<{ chainId: string }>();

const chain = computed(() => CHAIN_DISPLAY[props.chainId] ?? { name: props.chainId, color: "#9F9F9F" });
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 text-75 font-medium px-2 py-0.5 rounded-full"
    style="background: rgba(255,255,255,0.05)"
  >
    <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: chain.color }"></span>
    {{ chain.name }}
  </span>
</template>
