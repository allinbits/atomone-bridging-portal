<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed, Ref, ref } from "vue";

import { bus } from "@/bus";
import chainConfig from "@/chain-config.json";
import CommonButton from "@/components/ui/CommonButton.vue";
import DropDown from "@/components/ui/DropDown.vue";
import UiInput from "@/components/ui/UiInput.vue";
import { useBridges } from "@/composables/useBridge.ts";
import { useWallet } from "@/composables/useWallet";
import routes from "@/routes.json";

const Wallet = useWallet();
const srcIndex = ref(0);
const destIndex = ref(0);
const tokenIndex = ref(0);
const amount = ref("");
const recipientAddress = ref("");

const itemsSrc = computed(() => {
  return routes.map((route) => ({
    name: route.src,
    status: "active"
  }));
});
const itemsDest = computed(() => {
  return routes[srcIndex.value].dest.map((dest) => ({
    name: dest,
    status: "active"
  }));
});
const handleSrcIndexChange = (index: number) => {
  srcIndex.value = index;
};
const handleDestIndexChange = (index: number) => {
  destIndex.value = index;
};

const handleTokenIndexChange = (index: number) => {
  if (index !== tokenIndex.value) {
    amount.value = "";
  }
  tokenIndex.value = index;
};

const balancesFetcher = (address: Ref<string>) => fetch(`${chainConfig.rest}cosmos/bank/v1beta1/balances/${address.value}?pagination.limit=1000`).then((response) => response.json());
const { data: balances } = useQuery({
  queryKey: ["balances"],
  queryFn: () => balancesFetcher(Wallet.address),
  enabled: Wallet.loggedIn.value
});
const balance = computed(() => {
  if (balances && balances.value) {
    return balances.value;
  } else {
    return [];
  }
});
const max = computed(() => {
  const tokenDenom = tokenIndex.value === 0
    ? "uatone"
    : "uphoton";
  const tokenBalance = balance.value.balances?.find((b: { denom: string }) => b.denom === tokenDenom);
  return tokenBalance
    ? (Number(tokenBalance.amount) / Math.pow(
      10,
      chainConfig.currencies.find((c) => c.coinMinimalDenom.toLowerCase() === tokenDenom)?.coinDecimals || 0
    )).toString()
    : "0";
});

const handleButtonClick = () => {
  if (!Wallet.loggedIn.value) {
    bus.emit("open");
  } else {
    const { createBridge } = useBridges();
    createBridge(
      routes[srcIndex.value].src.toLowerCase(),
      routes[srcIndex.value].dest[destIndex.value].toLowerCase(),
      recipientAddress.value,
      tokenIndex.value === 0
        ? "uatone"
        : "uphoton",
      amount.value
    );
  }
};
</script>

<template>
  <div class="flex flex-col w-full min-h-[calc(100vh-200px)] pb-[72px] gap-4 items-center justify-center">
    <!-- Centered Card -->
    <div class="bg-grey-300 rounded-lg p-8 shadow-lg w-full max-w-md">
      <h2 class="text-xl font-semibold mb-6 text-center">Bridge Tokens:</h2>

      <!-- Token Selection -->
      <div class="flex flex-col mb-4">
        <span class="mb-2 text-sm text-grey-100">Select Token:</span>
        <DropDown
          :items="[
            { name: 'ATONE', status: 'active' },
            { name: 'PHOTON', status: 'active' }
          ]"
          :model-value="tokenIndex"
          @select="handleTokenIndexChange"
        />
      </div>

      <!-- Src Network Selection -->
      <div class="flex flex-col mb-4">
        <span class="mb-2 text-sm text-grey-100">From:</span>
        <DropDown
          :items="itemsSrc"
          :model-value="srcIndex"
          @select="handleSrcIndexChange"
        />
      </div>

      <!-- Dest Network Selection -->
      <div class="flex flex-col mb-4">
        <span class="mb-2 text-sm text-grey-100">To:</span>
        <DropDown
          :items="itemsDest"
          :model-value="destIndex"
          @select="handleDestIndexChange"
        />
      </div>

      <!-- Amount Input -->
      <div class="flex flex-col mb-4">
        <span class="mb-2 text-sm text-grey-100">Amount:</span>
        <div class="relative group">
          <UiInput
            :model-value="amount"
            @update:model-value="amount = $event"
            type="number"
            placeholder="Enter amount"
            class="w-full"
            :max="Number(max)"
            :disabled="!Wallet.loggedIn.value"
          />
          <!-- Tooltip for disabled state -->
          <div
            v-if="!Wallet.loggedIn.value"
            class="absolute left-1/2 -translate-x-1/2 bottom-full  px-3 py-2 bg-red-400 text-light text-75 italic font-medium rounded-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10"
          >
            Connect your wallet to enter an amount
            <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-red-400"></div>
          </div>
        </div>
      </div>

      <!-- Recipient Address Input -->
      <div class="flex flex-col mb-4">
        <span class="mb-2 text-sm text-grey-100">Recipient Address:</span>
        <div class="relative group">
          <UiInput
            :model-value="recipientAddress"
            @update:model-value="recipientAddress = $event"
            type="text"
            placeholder="Enter recipient address"
            class="w-full"
            :disabled="!Wallet.loggedIn.value"
          />
          <!-- Tooltip for disabled state -->
          <div
            v-if="!Wallet.loggedIn.value"
            class="absolute left-1/2 -translate-x-1/2 bottom-full px-3 py-2 bg-red-400 text-light text-75 italic font-medium rounded-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10"
          >
            Connect your wallet to enter a recipient address
            <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-red-400"></div>
          </div>
        </div>
      </div>

      <!-- Bridge / Connect Button -->
      <div class="flex justify-center mt-6">
        <CommonButton
          @click="handleButtonClick"
        >
          {{ Wallet.loggedIn.value ? 'Bridge' : 'Connect Wallet' }}
        </CommonButton>
      </div>
    </div>
  </div>
</template>
