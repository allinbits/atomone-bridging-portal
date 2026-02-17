<script lang="ts" setup>
import { useQuery } from "@tanstack/vue-query";
import { computed, Ref, ref } from "vue";

import { bus } from "@/bus";
import ConnectButton from "@/components/ui/ConnectButton.vue";
import {
  EthWallets,
  getEthWalletHelp,
  SupportedChain,
  useEthWallet
} from "@/composables/useEthWallet";
import { shorten } from "@/utility";

const props = defineProps<{
  targetChain?: SupportedChain;
}>();

const isOpen = ref(false);
const isConnecting = ref(false);
const isError = ref(false);
const isSlowConnecting = ref(false);

const {
  connect,
  signOut,
  address,
  loggedIn,
  hasAnyProvider,
  hasKeplrEthereum,
  hasLeapEthereum,
  hasWindowEthereum,
  isMetaMask,
  isCoinbase,
  isRabby,
  chainId,
  getBalance,
  getAtoneBalance,
  getPhotonBalance,
  used,
  desiredChain
} = useEthWallet();

// Fetch token balances on chains where ATONE/PHOTON exist
const isSupportedEvmChain = computed(() => chainId.value === 1 || chainId.value === 8453);

const { data: balance } = useQuery({
  queryKey: [
    "eth-balance",
    address
  ],
  queryFn: () => getBalance(),
  enabled: loggedIn
});

const { data: atoneBalance } = useQuery({
  queryKey: [
    "eth-atone-balance",
    address
  ],
  queryFn: () => getAtoneBalance(),
  enabled: computed(() => loggedIn.value && isSupportedEvmChain.value)
});

const { data: photonBalance } = useQuery({
  queryKey: [
    "eth-photon-balance",
    address
  ],
  queryFn: () => getPhotonBalance(),
  enabled: computed(() => loggedIn.value && isSupportedEvmChain.value)
});

const displayBalance = computed(() => {
  if (balance.value) {
    const num = parseFloat(balance.value);
    return num.toFixed(4);
  }
  return "0.0000";
});

const displayAtoneBalance = computed(() => {
  if (atoneBalance.value) {
    const num = parseFloat(atoneBalance.value);
    return num.toFixed(6);
  }
  return "0.000000";
});

const displayPhotonBalance = computed(() => {
  if (photonBalance.value) {
    const num = parseFloat(photonBalance.value);
    return num.toFixed(6);
  }
  return "0.000000";
});

const chainName = computed(() => {
  if (chainId.value === 1) return "Ethereum";
  if (chainId.value === 8453) return "Base";
  return "Unknown";
});

// Get icon name for a wallet
const getWalletIcon = (wallet: EthWallets) => {
  switch (wallet) {
    case EthWallets.keplr:
      return "keplr";
    case EthWallets.leap:
      return "leap";
    default:
      return "ethereum";
  }
};

// Get detected window.ethereum wallet name
const windowEthereumWalletName = computed(() => {
  if (isMetaMask.value) return EthWallets.metamask;
  if (isCoinbase.value) return EthWallets.coinbase;
  if (isRabby.value) return EthWallets.rabby;
  return EthWallets.generic;
});

const connectState = computed(() => !isConnecting.value && !isOpen.value && !loggedIn.value && !isError.value);
const selectState = computed(() => !isConnecting.value && isOpen.value && !loggedIn.value && !isError.value);
const connectingState = computed(() => isConnecting.value && isOpen.value && !loggedIn.value && !isError.value);
const connectedState = computed(() => !isConnecting.value && !isOpen.value && loggedIn.value && !isError.value);
const viewState = computed(() => !isConnecting.value && isOpen.value && loggedIn.value && !isError.value);
const errorState = computed(() => isOpen.value && isError.value);

const controller: Ref<AbortController | null> = ref(null);
const chosenWallet: Ref<EthWallets> = ref(EthWallets.generic);

const connectWallet = async (wallet: EthWallets) => {
  isError.value = false;
  isConnecting.value = true;
  isOpen.value = true;
  isSlowConnecting.value = false;
  chosenWallet.value = wallet;
  let slow: ReturnType<typeof setTimeout> | null = null;
  controller.value = new AbortController();
  try {
    slow = setTimeout(
      () => isSlowConnecting.value = true,
      10000
    );
    await connect(
      wallet,
      props.targetChain ?? desiredChain.value,
      controller.value.signal
    );
    isConnecting.value = false;
    isSlowConnecting.value = false;
    isOpen.value = false;
    if (slow) {
      clearTimeout(slow);
      slow = null;
    }
  } catch (_e) {
    isConnecting.value = false;
    isSlowConnecting.value = false;
    isError.value = true;
    if (slow) {
      clearTimeout(slow);
      slow = null;
    }
  }
};

const cancelConnect = () => {
  controller.value?.abort();
  isConnecting.value = false;
  isSlowConnecting.value = false;
  isOpen.value = false;
  isError.value = false;
};

bus.on(
  "open-eth",
  () => {
    isOpen.value = true;
  }
);
</script>

<template>
  <div>
    <!-- Normal signed out button -->
    <template v-if="connectState">
      <button
        class="justify-center px-6 py-4 rounded bg-grey-400 text-300 text-center hover:bg-light hover:text-dark duration-200"
        @click="() => { isOpen = true; }"
      >
        {{ $t("components.EthWalletConnect.button") }}
      </button>
    </template>

    <!-- Wallet Selection -->
    <Transition name="fade">
      <template v-if="selectState">
        <div class="absolute right-0 top-4 z-10">
          <div class="flex flex-col gap-6 px-8 py-6 bg-grey-300 rounded w-80 relative">
            <Icon
              class="absolute top-3 right-4 cursor-pointer text-light"
              icon="close"
              @click="isOpen = false"
            />
            <div class="flex flex-col text-[white] text-500 font-semibold text-center">
              {{ $t("components.EthWalletConnect.cta") }}
            </div>
            <div class="flex flex-col text-grey-100 text-200 font-medium text-center leading-5">
              {{ $t("components.EthWalletConnect.selectWallet") }}
            </div>

            <!-- Cosmos wallets with EVM support (prioritized) -->
            <div v-if="hasKeplrEthereum || hasLeapEthereum" class="buttons">
              <span class="text-grey-100 text-100 text-center leading-4 mb-2 block">
                {{ $t("components.EthWalletConnect.cosmosWallets") }}
              </span>
              <ConnectButton
                v-if="hasKeplrEthereum"
                class="my-2"
                @click="connectWallet(EthWallets.keplr)"
              >
                <template #icon>
                  <Icon icon="keplr" :size="1.4" class="mr-2" />
                </template>
                Keplr (EVM)
              </ConnectButton>
              <ConnectButton
                v-if="hasLeapEthereum"
                class="my-2"
                @click="connectWallet(EthWallets.leap)"
              >
                <template #icon>
                  <Icon icon="leap" :size="1.1" class="mr-2 bg-dark p-1 rounded-sm" />
                </template>
                Leap (EVM)
              </ConnectButton>
            </div>

            <!-- Standard Ethereum wallets -->
            <div v-if="hasWindowEthereum" class="buttons">
              <span class="text-grey-100 text-100 text-center leading-4 mb-2 block">
                {{ $t("components.EthWalletConnect.evmWallets") }}
              </span>
              <ConnectButton
                class="my-2"
                @click="connectWallet(windowEthereumWalletName)"
              >
                <template #icon>
                  <Icon :icon="getWalletIcon(windowEthereumWalletName)" :size="1.4" class="mr-2" />
                </template>
                {{ windowEthereumWalletName }}
              </ConnectButton>
            </div>

            <span v-if="!hasAnyProvider" class="text-neg-200 text-100 text-center leading-4">
              {{ $t("components.EthWalletConnect.noWallet") }}
            </span>
          </div>
        </div>
      </template>

      <!-- Normal signed in account display -->
      <template v-else-if="connectedState">
        <div class="flex align-center items-stretch cursor-pointer" @click="isOpen = true">
          <div class="bg-gradient-eth w-10 h-10 rounded-full mr-3 flex items-center justify-center">
            <Icon v-if="used" :icon="getWalletIcon(used)" :size="1.2" class="text-white" />
          </div>
          <div class="flex flex-col justify-around">
            <div class="text-light text-200">{{ shorten(address) }}</div>
            <div class="text-100 text-grey-100">
              <template v-if="isSupportedEvmChain">
                {{ displayAtoneBalance }} ATONE
              </template>
              <template v-else>
                {{ displayBalance }} ETH ({{ chainName }})
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- Normal signed in account extended -->
      <template v-else-if="viewState">
        <div class="absolute right-0 top-4 z-10">
          <div class="flex flex-col px-8 py-4 pt-12 bg-grey-300 rounded w-80 relative">
            <Icon class="absolute top-3 right-4 cursor-pointer text-light" icon="close" @click="isOpen = false" />
            <div class="flex align-center items-stretch">
              <div class="bg-gradient-eth w-10 h-10 rounded-full mr-3 flex items-center justify-center">
                <Icon v-if="used" :icon="getWalletIcon(used)" :size="1.2" class="text-white" />
              </div>
              <div class="flex flex-col justify-around">
                <div class="text-light text-300">{{ shorten(address) }}</div>
                <div class="text-100 text-grey-100">{{ used }}</div>
              </div>
            </div>
            <div class="text-200 text-grey-100 pt-6 pb-2">{{ $t("components.EthWalletConnect.balance") }}</div>
            <div class="text-300 text-light">
              {{ displayBalance }} ETH
              <template v-if="isSupportedEvmChain">
                <br />
                {{ displayAtoneBalance }} ATONE
                <br />
                {{ displayPhotonBalance }} PHOTON
              </template>
            </div>
            <div class="text-100 text-grey-100 pt-2">
              {{ $t("components.EthWalletConnect.network") }}: {{ chainName }}
            </div>
            <div class="buttons">
              <ConnectButton
                class="my-4 justify-center"
                @click="signOut(); isOpen = false;"
              >
                {{ $t("components.EthWalletConnect.disconnect") }}
              </ConnectButton>
            </div>
          </div>
        </div>
      </template>

      <!-- Connection in progress -->
      <template v-else-if="connectingState">
        <div class="absolute right-0 top-4 z-10">
          <div class="flex flex-col px-8 py-4 pt-6 bg-grey-300 rounded w-80 relative align-center items-center">
            <Icon icon="loading" :size="3" />

            <div class="flex flex-col text-[white] text-400 font-semibold text-center mt-4">
              {{ $t("components.EthWalletConnect.connecting") }}
            </div>
            <div class="text-200 text-grey-100 my-4">{{ $t("components.EthWalletConnect.wait") }}</div>
            <div class="buttons">
              <ConnectButton class="my-4 justify-center" @click="() => { cancelConnect(); }">
                {{ $t("ui.actions.cancel") }}
              </ConnectButton>
            </div>

            <div v-if="isSlowConnecting">
              <a
                :href="getEthWalletHelp(chosenWallet)"
                target="_blank"
                class="text-100 flex my-2 justify-center items-center"
              >
                {{ chosenWallet }} {{ $t("components.EthWalletConnect.trouble") }}
                <Icon icon="link" class="ml-2" />
              </a>
            </div>
          </div>
        </div>
      </template>
    </Transition>

    <!-- Connection failed -->
    <template v-if="errorState">
      <div class="absolute right-0 top-4 z-10">
        <div class="flex flex-col px-8 py-4 pt-6 bg-grey-300 rounded w-80 relative align-center items-center">
          <Icon icon="close" :size="3" class="text-neg-200" />

          <div class="flex flex-col text-[white] text-400 font-semibold text-center mt-4">
            {{ $t("components.EthWalletConnect.failed") }}
          </div>
          <div class="text-200 text-grey-100 my-4 text-center">{{ $t("components.EthWalletConnect.failedSub") }}</div>
          <div class="buttons">
            <ConnectButton class="my-4 justify-center" @click="() => { connectWallet(chosenWallet); }">
              {{ $t("components.EthWalletConnect.retry") }}
            </ConnectButton>
            <ConnectButton class="my-4 justify-center" @click="() => { cancelConnect(); }">
              {{ $t("ui.actions.done") }}
            </ConnectButton>
          </div>

          <div>
            <a
              :href="getEthWalletHelp(chosenWallet)"
              target="_blank"
              class="text-100 flex my-2 justify-center items-center"
            >
              {{ chosenWallet }} {{ $t("components.EthWalletConnect.trouble") }}
              <Icon icon="link" class="ml-2" />
            </a>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.bg-gradient-eth {
  background: linear-gradient(135deg, #627eea 0%, #3c3c3d 100%);
}
</style>
