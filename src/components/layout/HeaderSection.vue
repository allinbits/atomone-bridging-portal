<script lang="ts" setup>
import EthWalletConnect from "@/components/popups/EthWalletConnect.vue";
import Mint from "@/components/popups/Mint.vue";
import WalletConnect from "@/components/popups/WalletConnect.vue";
import AuditStatus from "@/components/warnings/AuditStatus.vue";
import { useWallet } from "@/composables/useWallet.ts";

const Wallet = useWallet();
const securityLink = "https://github.com/allinbits/security/";
</script>

<template>
  <header>
    <nav class="flex flex-row justify-between md:items-center py-4 w-full select-none relative">
      <div class="flex flex-col md:flex-row justify-start gap-x-8 md:items-center select-none relative">
        <router-link to="/" class="text-500 font-termina py-4">{{ $t("homepage.title") }}</router-link>
      </div>
      <div class="flex flex-row items-center justify-center gap-8">
        <router-link active-class="text-light" to="/faq" class="text-300 py-4 hover:text-light text-grey-100">{{
          $t("homepage.viewFaq")
        }}</router-link>
        <a :href="securityLink" target="_blank" class="hover:text-light text-grey-100 duration-200">{{
          $t("homepage.security")
        }}</a>

        <Mint
          v-if="Wallet.loggedIn.value"
          class="flex-grow"
        />
        <EthWalletConnect class="hidden md:block" />
        <WalletConnect class="hidden md:block" />
      </div>
    </nav>
    <AuditStatus :link="securityLink" />
  </header>
</template>
