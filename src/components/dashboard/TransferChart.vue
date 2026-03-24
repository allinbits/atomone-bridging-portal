<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
  data: Array<{
    date: string;
    total: number;
    atomoneToEth: number;
    ethToAtomone: number;
    atomoneToBase: number;
    baseToAtomone: number;
  }>;
  loading?: boolean;
}>();

const maxValue = computed(() => {
  if (!props.data.length) return 1;
  return Math.max(...props.data.map((d) => d.total), 1);
});

const barWidth = computed(() => {
  if (!props.data.length) return 0;
  // Each bar takes equal width, with small gaps
  return Math.max(100 / props.data.length - 1, 2);
});

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// Show ~6 evenly spaced labels
const labelIndices = computed(() => {
  const len = props.data.length;
  if (len <= 6) return props.data.map((_, i) => i);
  const step = Math.floor(len / 5);
  const indices = [];
  for (let i = 0; i < len; i += step) indices.push(i);
  if (indices[indices.length - 1] !== len - 1) indices.push(len - 1);
  return indices;
});
</script>

<template>
  <div class="bg-grey-300 rounded-lg p-5">
    <h3 class="text-200 font-semibold mb-4">Daily Transfer Volume</h3>

    <div v-if="loading" class="h-48 flex items-center justify-center">
      <span class="text-grey-100 text-100">Loading chart data...</span>
    </div>

    <div v-else-if="!data.length" class="h-48 flex items-center justify-center">
      <span class="text-grey-100 text-100">No transfer data available</span>
    </div>

    <div v-else class="flex flex-col gap-2">
      <!-- SVG Chart -->
      <div class="relative w-full" style="height: 200px">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
          class="overflow-visible"
        >
          <!-- Horizontal grid lines -->
          <line x1="0" y1="0" x2="1000" y2="0" stroke="#272727" stroke-width="1" />
          <line x1="0" y1="50" x2="1000" y2="50" stroke="#272727" stroke-width="1" />
          <line x1="0" y1="100" x2="1000" y2="100" stroke="#272727" stroke-width="1" />
          <line x1="0" y1="150" x2="1000" y2="150" stroke="#272727" stroke-width="1" />
          <line x1="0" y1="200" x2="1000" y2="200" stroke="#272727" stroke-width="1" />

          <!-- Stacked bars -->
          <g v-for="(point, i) in data" :key="point.date">
            <!-- AtomOne->Eth (bottom) -->
            <rect
              :x="(i / data.length) * 1000 + 2"
              :y="200 - (point.atomoneToEth / maxValue) * 200"
              :width="barWidth * 10"
              :height="Math.max((point.atomoneToEth / maxValue) * 200, 0)"
              fill="#627EEA"
              opacity="0.8"
            >
              <title>{{ formatDate(point.date) }}: AtomOne→Eth {{ point.atomoneToEth }}</title>
            </rect>
            <!-- Eth->AtomOne (stacked on top) -->
            <rect
              :x="(i / data.length) * 1000 + 2"
              :y="200 - ((point.atomoneToEth + point.ethToAtomone) / maxValue) * 200"
              :width="barWidth * 10"
              :height="Math.max((point.ethToAtomone / maxValue) * 200, 0)"
              fill="#6BEFFF"
              opacity="0.8"
            >
              <title>{{ formatDate(point.date) }}: Eth→AtomOne {{ point.ethToAtomone }}</title>
            </rect>
            <!-- AtomOne->Base -->
            <rect
              :x="(i / data.length) * 1000 + 2"
              :y="200 - ((point.atomoneToEth + point.ethToAtomone + point.atomoneToBase) / maxValue) * 200"
              :width="barWidth * 10"
              :height="Math.max((point.atomoneToBase / maxValue) * 200, 0)"
              fill="#0052FF"
              opacity="0.8"
            >
              <title>{{ formatDate(point.date) }}: AtomOne→Base {{ point.atomoneToBase }}</title>
            </rect>
            <!-- Base->AtomOne -->
            <rect
              :x="(i / data.length) * 1000 + 2"
              :y="200 - ((point.atomoneToEth + point.ethToAtomone + point.atomoneToBase + point.baseToAtomone) / maxValue) * 200"
              :width="barWidth * 10"
              :height="Math.max((point.baseToAtomone / maxValue) * 200, 0)"
              fill="#F4AFFF"
              opacity="0.8"
            >
              <title>{{ formatDate(point.date) }}: Base→AtomOne {{ point.baseToAtomone }}</title>
            </rect>
          </g>
        </svg>
      </div>

      <!-- X-axis labels -->
      <div class="flex justify-between text-75 text-grey-50 px-1">
        <span v-for="idx in labelIndices" :key="idx">{{ formatDate(data[idx].date) }}</span>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-4 mt-2 text-75 text-grey-50">
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-2 rounded-xs" style="background: #627EEA"></span> AtomOne → Ethereum
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-2 rounded-xs" style="background: #6BEFFF"></span> Ethereum → AtomOne
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-2 rounded-xs" style="background: #0052FF"></span> AtomOne → Base
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-2 rounded-xs" style="background: #F4AFFF"></span> Base → AtomOne
        </span>
      </div>
    </div>
  </div>
</template>
