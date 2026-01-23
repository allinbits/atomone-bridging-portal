<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed, Ref } from "vue";

import chainConfig from "@/chain-config.json";
import { useWallet } from "@/composables/useWallet";
import { formatAmount } from "@/utility";

const { address, loggedIn } = useWallet();
const { denom } = defineProps<{ denom: string }>();

const balancesFetcher = (address: Ref<string>) => fetch(`${chainConfig.rest}cosmos/bank/v1beta1/balances/${address.value}?pagination.limit=1000`).then((response) => response.json());
const { data: balances } = useQuery({
  queryKey: ["balances"],
  queryFn: () => balancesFetcher(address),
  enabled: loggedIn
});
const balance = computed(() => {
  if (balances && balances.value) {
    return (
      balances.value.balances.filter((x: { denom: string }) => x.denom == denom)[0] ?? { amount: "0",
        denom: denom }
    );
  } else {
    return { amount: "0",
      denom: denom };
  }
});
</script>
<template>
  <span v-if="balance">{{
    formatAmount(balance.amount, chainConfig.currencies.find((x) => x.coinMinimalDenom == denom)?.coinDecimals ?? 6)
  }}</span>
</template>
