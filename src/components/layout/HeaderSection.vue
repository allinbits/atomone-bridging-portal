<script lang="ts" setup>
import EthWalletConnect from "@/components/popups/EthWalletConnect.vue";
import Mint from "@/components/popups/Mint.vue";
import WalletConnect from "@/components/popups/WalletConnect.vue";
import AuditStatus from "@/components/warnings/AuditStatus.vue";
import { useNetwork } from "@/composables/useNetwork.ts";
import { useWallet } from "@/composables/useWallet.ts";
import { NETWORK_NAMES, type NetworkName, NETWORKS } from "@/networks";

const Wallet = useWallet();
const { network, setNetwork } = useNetwork();
const securityLink = "https://github.com/allinbits/security/";

const onNetworkSelect = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as NetworkName;
  setNetwork(value);
};
</script>

<template>
  <header>
    <nav class="flex flex-row justify-between md:items-center py-4 w-full select-none relative">
      <div class="flex flex-col md:flex-row justify-start gap-x-8 md:items-center select-none relative">
        <router-link to="/" class="text-500 font-termina py-4">{{ $t("homepage.title") }}</router-link>
      </div>
      <div class="flex flex-row items-center justify-center gap-8">
        <!-- Network switcher: devnet / testnet / mainnet -->
        <label class="flex items-center gap-2 py-4 text-300 text-grey-100">
          <span class="hidden sm:inline">Network</span>
          <select
            :value="network"
            class="bg-grey-400 text-light rounded px-2 py-2 cursor-pointer hover:bg-grey-200 duration-200"
            @change="onNetworkSelect"
          >
            <option
              v-for="name in NETWORK_NAMES"
              :key="name"
              :value="name"
            >
              {{ NETWORKS[name].label }}{{ !NETWORKS[name].available ? " (no routes)" : "" }}
            </option>
          </select>
        </label>
        <router-link active-class="text-light" to="/faq" class="text-300 py-4 hover:text-light text-grey-100">{{
          $t("homepage.viewFaq")
        }}</router-link>
        <a :href="securityLink" target="_blank" class="hover:text-light text-grey-100 duration-200">{{
          $t("homepage.security")
        }}</a>

        <Mint
          v-if="Wallet.loggedIn.value"
          class="grow"
        />
        <EthWalletConnect class="hidden md:block" />
        <WalletConnect class="hidden md:block" />
      </div>
    </nav>
    <AuditStatus :link="securityLink" />
  </header>
</template>
