<script lang="ts" setup>
import type { RouteFilter, TimeRange, TokenFilter } from "@/composables/useDashboard";

const tokenFilter = defineModel<TokenFilter>(
  "tokenFilter",
  { required: true }
);
const routeFilter = defineModel<RouteFilter>(
  "routeFilter",
  { required: true }
);
const timeRange = defineModel<TimeRange>(
  "timeRange",
  { required: true }
);

const emit = defineEmits<{ (e: "reset"): void }>();

const tokenOptions: { value: TokenFilter;
  label: string; }[] = [
  { value: "all",
    label: "All Tokens" },
  { value: "ATONE",
    label: "ATONE" },
  { value: "PHOTON",
    label: "PHOTON" }
];

const routeOptions: { value: RouteFilter;
  label: string; }[] = [
  { value: "all",
    label: "All Routes" },
  { value: "atomone-ethereum",
    label: "AtomOne - Ethereum" },
  { value: "atomone-base",
    label: "AtomOne - Base" }
];

const timeOptions: { value: TimeRange;
  label: string; }[] = [
  { value: 7,
    label: "7 days" },
  { value: 30,
    label: "30 days" },
  { value: 90,
    label: "90 days" }
];

function handleRouteChange (val: RouteFilter) {
  routeFilter.value = val;
  emit("reset");
}

function handleTokenChange (val: TokenFilter) {
  tokenFilter.value = val;
}
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <select
      :value="tokenFilter"
      class="bg-grey-400 text-light text-100 rounded px-3 py-2 border border-grey-200 focus:outline-none focus:border-grey-100 cursor-pointer"
      @change="handleTokenChange(($event.target as HTMLSelectElement).value as TokenFilter)"
    >
      <option v-for="opt in tokenOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>

    <select
      :value="routeFilter"
      class="bg-grey-400 text-light text-100 rounded px-3 py-2 border border-grey-200 focus:outline-none focus:border-grey-100 cursor-pointer"
      @change="handleRouteChange(($event.target as HTMLSelectElement).value as RouteFilter)"
    >
      <option v-for="opt in routeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>

    <select
      :value="timeRange"
      class="bg-grey-400 text-light text-100 rounded px-3 py-2 border border-grey-200 focus:outline-none focus:border-grey-100 cursor-pointer"
      @change="timeRange = Number(($event.target as HTMLSelectElement).value) as TimeRange"
    >
      <option v-for="opt in timeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </div>
</template>
