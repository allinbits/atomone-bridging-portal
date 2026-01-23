<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  amount?: number;
  denom: string;
}>();
const intAmount = computed(() => {
  if (props.amount) {
    return new Intl.NumberFormat("en-US").format(Math.floor(props.amount));
  } else {
    return "-";
  }
});
const fractAmount = computed(() => {
  if (props.amount) {
    return new Intl.NumberFormat(
      "en-US",
      { maximumFractionDigits: 8 }
    ).format(props.amount % 1).
      substring(1);
  } else {
    return "";
  }
});
</script>
<template>
  <span>
    {{ intAmount
    }}<span class="text-75">
      {{ fractAmount }}
    </span>
    <span v-if="amount" class="text-75"> {{ " " + denom }}</span>
  </span>
</template>
