<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed, Ref, ref } from "vue";

import { bus } from "@/bus";
import chainConfig from "@/chain-config.json";
import CommonButton from "@/components/ui/CommonButton.vue";
import DropDown from "@/components/ui/DropDown.vue";
import UiInput from "@/components/ui/UiInput.vue";
import { useBridges } from "@/composables/useBridge.ts";
import { type SupportedChain, useEthWallet } from "@/composables/useEthWallet";
import { useWallet } from "@/composables/useWallet";
import routes from "@/routes.json";

const Wallet = useWallet();
const EthWallet = useEthWallet();
const srcIndex = ref(0);
const destIndex = ref(0);
const tokenIndex = ref(0);
const amount = ref("");
const recipientAddress = ref("");

// Get all unique tokens from routes
const availableTokens = computed(() => {
  return Array.from(new Set(routes.map((route) => route.denom))).map((denom) => ({
    name: denom === "uatone"
      ? "ATONE"
      : "PHOTON",
    denom: denom,
    status: "active"
  }));
});

// Get all unique source chains
const allSources = computed(() => {
  return Array.from(new Set(routes.map((route) => route.src))).map((src) => ({
    name: src,
    status: "active"
  }));
});

// Get filtered source chains based on selected token
const itemsSrc = computed(() => {
  const selectedToken = availableTokens.value[tokenIndex.value]?.denom;
  if (!selectedToken) {
    return allSources.value;
  }

  const validSources = routes.
    filter((route) => route.denom === selectedToken).
    map((route) => route.src);

  return allSources.value.filter((src) => validSources.includes(src.name));
});

// Get filtered destinations based on selected source and token
const itemsDest = computed(() => {
  const selectedSrc = itemsSrc.value[srcIndex.value]?.name;
  if (!selectedSrc) {
    return [];
  }

  let validRoutes = routes.filter((route) => route.src === selectedSrc);

  // If a token is selected, filter by token as well
  const selectedToken = availableTokens.value[tokenIndex.value]?.denom;
  if (selectedToken) {
    validRoutes = validRoutes.filter((route) => route.denom === selectedToken);
  }

  const destinations = Array.from(new Set(validRoutes.map((route) => route.dest)));
  return destinations.map((dest) => ({ name: dest,
    status: "active" }));
});

const switchEvmIfNeeded = (chainName: string | undefined) => {
  if (chainName === "Ethereum" || chainName === "Base") {
    const chain = chainName.toLowerCase() as SupportedChain;
    EthWallet.desiredChain.value = chain;
    if (EthWallet.loggedIn.value) {
      EthWallet.switchChain(chain);
    }
  }
};

const handleSrcIndexChange = (index: number) => {
  srcIndex.value = index;
  // Reset destination if it's no longer valid
  if (destIndex.value >= itemsDest.value.length) {
    destIndex.value = 0;
  }
  switchEvmIfNeeded(itemsSrc.value[index]?.name);
};

const handleDestIndexChange = (index: number) => {
  destIndex.value = index;
  switchEvmIfNeeded(itemsDest.value[index]?.name);
};

const handleTokenIndexChange = (index: number) => {
  if (index !== tokenIndex.value) {
    amount.value = "";
  }
  tokenIndex.value = index;

  // Reset src if it's no longer valid
  if (srcIndex.value >= itemsSrc.value.length) {
    srcIndex.value = 0;
  }
  // Reset dest if it's no longer valid
  if (destIndex.value >= itemsDest.value.length) {
    destIndex.value = 0;
  }
  switchEvmIfNeeded(itemsSrc.value[srcIndex.value]?.name);
};

const balancesFetcher = (address: Ref<string>) => fetch(`${chainConfig.rest}cosmos/bank/v1beta1/balances/${address.value}?pagination.limit=1000`).then((response) => response.json());
const { data: balances } = useQuery({
  queryKey: ["balances"],
  queryFn: () => balancesFetcher(Wallet.address),
  enabled: Wallet.loggedIn
});
const balance = computed(() => {
  if (balances && balances.value) {
    return balances.value;
  } else {
    return [];
  }
});

// Ethereum token balances
const { data: ethAtoneBalance } = useQuery({
  queryKey: ["eth-atone-balance"],
  queryFn: () => EthWallet.getAtoneBalance(),
  enabled: EthWallet.loggedIn
});
const { data: ethPhotonBalance } = useQuery({
  queryKey: ["eth-photon-balance"],
  queryFn: () => EthWallet.getPhotonBalance(),
  enabled: EthWallet.loggedIn
});
const isAmountInputDisabled = computed(() => {
  const selectedSrc = itemsSrc.value[srcIndex.value]?.name;
  if (selectedSrc === "Ethereum" || selectedSrc === "Base") {
    return !EthWallet.loggedIn.value;
  }
  return !Wallet.loggedIn.value;
});

const max = computed(() => {
  if (!availableTokens.value[tokenIndex.value]) return "0";

  const tokenDenom = availableTokens.value[tokenIndex.value].denom;
  const selectedSrc = itemsSrc.value[srcIndex.value]?.name;
  console.log(ethAtoneBalance);
  // If source is an EVM chain, use ERC20 token balances
  if (selectedSrc === "Ethereum" || selectedSrc === "Base") {
    if (tokenDenom === "uatone") {
      return ethAtoneBalance?.value || "0";
    } else if (tokenDenom === "uphoton") {
      return ethPhotonBalance?.value || "0";
    }
    return "0";
  }

  // Otherwise use AtomOne balances
  const tokenBalance = balance.value.balances?.find((b: { denom: string }) => b.denom === tokenDenom);
  return tokenBalance
    ? (Number(tokenBalance.amount) / Math.pow(
      10,
      chainConfig.currencies.find((c) => c.coinMinimalDenom.toLowerCase() === tokenDenom)?.coinDecimals || 0
    )).toString()
    : "0";
});

// Validation function for recipient address
const validateRecipientAddress = computed(() => {
  if (!recipientAddress.value) {
    return { isValid: true,
      error: "" }; // Empty is valid (user hasn't entered yet)
  }

  const address = recipientAddress.value.trim();
  const selectedDest = itemsDest.value[destIndex.value]?.name;

  // Ethereum address validation (0x followed by 40 hex characters)
  if (selectedDest === "Ethereum" || selectedDest === "Base") {
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethRegex.test(address)) {
      return { isValid: false,
        error: "Invalid Ethereum address format" };
    }
  } else {
    // AtomOne address validation (bech32 format)
    const cosmosRegex = /^atone1[a-z0-9]{38,58}$/;
    if (!cosmosRegex.test(address)) {
      return { isValid: false,
        error: "Invalid AtomOne address format" };
    }
  }

  return { isValid: true,
    error: "" };
});

const fillRecipientAddress = computed(() => {
  const selectedDest = itemsDest.value[destIndex.value]?.name;
  if (selectedDest === "Ethereum" || selectedDest === "Base") {
    return EthWallet.loggedIn.value
      ? EthWallet.address.value
      : "";
  }
  return Wallet.loggedIn.value
    ? Wallet.address.value
    : "";
});

const handleFillRecipient = () => {
  if (fillRecipientAddress.value) {
    recipientAddress.value = fillRecipientAddress.value;
  }
};

const { createBridge, loading: bridgeLoading } = useBridges();

const handleButtonClick = async () => {
  if (!Wallet.loggedIn.value) {
    bus.emit("open");
  } else {
    const selectedSrc = itemsSrc.value[srcIndex.value]?.name;
    const selectedDest = itemsDest.value[destIndex.value]?.name;
    const selectedToken = availableTokens.value[tokenIndex.value]?.denom;

    if (selectedSrc && selectedDest && selectedToken) {
      try {
        const result = await createBridge(
          selectedSrc.toLowerCase(),
          selectedDest.toLowerCase(),
          recipientAddress.value,
          selectedToken,
          Number(amount.value) * Math.pow(
            10,
            chainConfig.currencies.find((c) => c.coinMinimalDenom.toLowerCase() === selectedToken)?.coinDecimals || 0
          ) + ""
        );
        amount.value = "";
        recipientAddress.value = "";
        bus.emit(
          "bridge-success",
          result?.packetHash ?? ""
        );
      } catch (e) {
        bus.emit(
          "bridge-error",
          e instanceof Error ? e.message : String(e)
        );
      }
    }
  }
};
</script>

<template>
  <div class="flex flex-col w-full min-h-[calc(100vh-200px)] pb-[72px] gap-4 items-center justify-center">
    <!-- Centered Card -->
    <div class="bg-grey-300 rounded-lg p-8 shadow-lg w-full max-w-lg">
      <h2 class="text-xl font-semibold mb-6 text-center">Bridge Tokens:</h2>

      <!-- Token Selection -->
      <div class="flex flex-col mb-4">
        <span class="mb-2 text-sm text-grey-100">Select Token:</span>
        <DropDown
          :items="availableTokens"
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
            :min="0"
            :max="Number(max)"
            :disabled="isAmountInputDisabled"
          />
          <!-- Tooltip for disabled state -->
          <div
            v-if="isAmountInputDisabled"
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
        <div class="flex gap-2 items-start">
          <div class="w-full min-w-0">
            <UiInput
              :model-value="recipientAddress"
              @update:model-value="recipientAddress = $event"
              type="text"
              placeholder="Enter recipient address"
              class="w-full"
              :is-error="!validateRecipientAddress.isValid"
              :error-message="validateRecipientAddress.error"
            />
          </div>
          <CommonButton
            :disabled="!fillRecipientAddress"
            :title="fillRecipientAddress ? 'Use my wallet address' : 'Connect the destination wallet first'"
            class="shrink-0 mt-3 px-3 py-5 rounded-md text-sm font-medium border border-transparent transition-colors"
            @click="handleFillRecipient"
          >
            My Address
          </CommonButton>
        </div>
      </div>

      <!-- Bridge / Connect Button -->
      <div class="flex justify-center mt-6">
        <CommonButton
          :disabled="bridgeLoading"
          @click="handleButtonClick"
        >
          <span class="inline-flex items-center gap-2">
            <Icon v-if="bridgeLoading" icon="loading" :size="1.2" />
            {{ bridgeLoading ? 'Bridging...' : Wallet.loggedIn.value ? 'Bridge' : 'Connect Wallet' }}
          </span>
        </CommonButton>
      </div>
    </div>
  </div>
</template>
