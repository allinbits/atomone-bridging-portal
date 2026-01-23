<script setup lang="ts">
import { MsgMintPhoton, MsgMintPhotonResponse } from "@atomone/atomone-types/atomone/photon/v1/tx";
import { Coin, DeliverTxResponse } from "@cosmjs/stargate";
import { useQuery } from "@tanstack/vue-query";
import { useClipboard } from "@vueuse/core";
import BigNumber from "bignumber.js";
import { computed, ref } from "vue";

import chainConfig from "@/chain-config.json";
import ModalWrap from "@/components/common/ModalWrap.vue";
import CommonButton from "@/components/ui/CommonButton.vue";
import Icon from "@/components/ui/Icon.vue";
import UiInfo from "@/components/ui/UiInfo.vue";
import UiInput from "@/components/ui/UiInput.vue";
import { usePhoton } from "@/composables/usePhoton";
import { useWallet, Wallets } from "@/composables/useWallet";
import { toPlainObjectString } from "@/utility";

const fetcher = () => fetch(chainConfig.rest + "cosmos/bank/v1beta1/supply").then((response) => response.json());
const { data } = useQuery({
  queryKey: ["supplies"],
  queryFn: () => fetcher()
});
const isOpen = ref(false);
const displayState = ref<"minted" | "CLI" | "pending" | "error">("pending");

const approxRate = computed(() => {
  if (!data.value) return null;
  const rate = (1000000000000000 - (data.value.supply.find((coin: Coin) => coin.denom === chainConfig.feeCurrencies[1].coinMinimalDenom)?.amount ?? 0)) / (data.value.supply.find((coin: Coin) => coin.denom === chainConfig.feeCurrencies[0].coinMinimalDenom)?.amount ?? 1);
  return rate;
});
const mintAmount = ref<number | null>(null);
const mintedAmount = ref<number | null>(null);
const mintedRate = ref<number | null>(null);
const errorMsg = ref<string>("");
const cliMintInput = ref("");
const transacting = ref<boolean>(false);
const mintDenomDecimals = computed(() => {
  return chainConfig.stakeCurrency.coinDecimals;
});

const resetDeposit = () => mintAmount.value = null;

const toggleModal = (dir: boolean) => {
  isOpen.value = dir;
  displayState.value = "pending";
  resetDeposit();
};

const { createMint } = usePhoton();
const { used, address } = useWallet();

const signMint = async (isCLI = false) => {
  if (!mintAmount.value || mintAmount.value <= 0) return;

  const mintOptions: Partial<MsgMintPhoton> = {
    toAddress: address.value,
    amount: {
      denom: chainConfig.stakeCurrency.coinMinimalDenom,
      amount:
        BigNumber(mintAmount.value).
          multipliedBy(10 ** mintDenomDecimals.value).
          toFixed(0) ?? ""
    }
  };
  try {
    transacting.value = true;
    console.log(mintOptions);
    const minted = await createMint(
      mintOptions,
      isCLI
    );
    if ((minted as DeliverTxResponse).code !== 0 && !isCLI) {
      transacting.value = false;
      errorMsg.value = (minted as DeliverTxResponse).rawLog ?? toPlainObjectString(minted);
      displayState.value = "error";
    } else {
      transacting.value = false;
      if (!isCLI) {
        const mintResponse = MsgMintPhotonResponse.decode((minted as DeliverTxResponse).msgResponses[0].value);
        mintedAmount.value = Number(mintResponse.minted?.amount);
        mintedRate.value = Number(mintResponse.conversionRate);
      }
      cliMintInput.value = (isCLI
        ? minted
        : "") as string;
      displayState.value = isCLI
        ? "CLI"
        : "minted";
    }
  } catch (e) {
    console.log(e);
    errorMsg.value = "" + e;
    transacting.value = false;
    displayState.value = "error";
  }
};

const { copy, copied, isSupported: isClipboardSupported } = useClipboard();
</script>

<template>
  <div class="relative">
    <div>
      <div
        class="justify-center px-3 py-4 rounded-sm bg-grey-200 hover:text-grey-50 text-light font-medium text-100 text-center cursor-pointer"
        @click="() => toggleModal(true)"
      >
        {{ $t("components.Mint.cta") }}
      </div>
    </div>

    <ModalWrap :visible="isOpen">
      <div class="bg-grey-400 w-full rounded-md max-h-screen overflow-auto">
        <div class="px-10 py-12 bg-grey-400 rounded w-screen max-w-[25rem]">
          <div v-show="displayState === 'pending'" class="flex flex-col gap-6 relative">
            <span class="text-gradient font-termina text-700 text-center">{{ $t("components.Mint.cta") }}</span>
            <div class="flex flex-col gap-10">
              <div>
                <div class="flex flex-col gap-10">
                  <form class="flex flex-col items-center gap-2">
                    <UiInput
                      v-model="mintAmount"
                      type="number"
                      placeholder="e.g. 50"
                      :label="'Amount of '+chainConfig.stakeCurrency.coinDenom+' to burn'"
                      :min="0"
                      :max="Infinity"
                      class="w-full justify-end"
                    />
                  </form>
                  <span class="text-300 text-grey-100">
                    {{ $t("components.Mint.toReceive") }}:<br/> ~{{ approxRate }} {{ chainConfig.feeCurrencies[1].coinDenom }} per {{ chainConfig.feeCurrencies[0].coinDenom }}
                  </span>
                </div>
              </div>

              <div v-if="!transacting" class="flex flex-col gap-4">
                <div v-show="(mintAmount ?? -1) > 0" class="flex flex-col gap-4">
                  <button
                    class="px-6 py-4 rounded link-gradient text-dark text-300 text-center w-full"
                    @click="signMint(true)"
                  >
                    {{ $t("ui.actions.cli") }}
                  </button>
                  <a
                    href="https://github.com/atomone-hub/atom.one/blob/main/content/english/submit-tx-securely.md"
                    target="_blank"
                    class="text-center text-100 text-grey-100 underline"
                  >
                    {{ $t("ui.actions.signTxSecurely") }}
                  </a>
                  <button
                    v-if="used != Wallets.addressOnly"
                    class="px-6 py-4 rounded text-light text-300 text-center w-full hover:opacity-50 duration-150 ease-in-out"
                    @click="signMint()"
                  >
                    {{ $t("ui.actions.confirm") }}
                  </button>
                </div>

                <button
                  class="px-6 py-4 rounded text-light text-300 text-center w-full hover:opacity-50 duration-150 ease-in-out"
                  @click="toggleModal(false)"
                >
                  {{ $t("ui.actions.cancel") }}
                </button>
              </div>

              <div v-if="transacting" class="flex flex-col gap-4">
                <div class="flex flex-col gap-4 items-center">
                  <Icon icon="loading" :size="2" />
                </div>
              </div>
            </div>
          </div>
          <div v-show="displayState === 'CLI'" class="flex flex-col gap-10">
            <div class="flex flex-col items-center gap-4">
              <span class="text-gradient font-termina text-700 text-center">{{ $t("components.Mint.cta") }}</span>
              <span class="text-grey-100">{{ $t("ui.actions.clicta") }}</span>
            </div>

            <div class="relative">
              <button
                v-if="isClipboardSupported"
                class="absolute top-4 right-4 text-200 hover:text-grey-50 duration-200"
                @click="copy(cliMintInput)"
              >
                <span v-show="copied">{{ $t("ui.actions.copied") }}</span>
                <span v-show="!copied" class="flex gap-1">
                  <Icon icon="copy" /><span>{{ $t("ui.actions.copy") }}</span>
                </span>
              </button>
              <textarea
                ref="CLIVote"
                v-model="cliMintInput"
                readonly
                class="w-full h-64 px-4 pb-4 pt-12 bg-grey-200 text-grey-50 rounded outline-none resize-none"
              ></textarea>
            </div>

            <div class="flex gap-x-4 items-stretch">
              <CommonButton class="w-full" @click="() => (displayState = 'pending')">{{
                $t("ui.actions.back")
              }}</CommonButton>
              <button
                class="w-full text-light bg-grey-200 hover:bg-light hover:text-dark roudned transition-colors duration-200 rounded py-4 px-6"
                @click="toggleModal(false)"
              >
                {{ $t("ui.actions.done") }}
              </button>
            </div>
          </div>
          <div v-show="displayState === 'minted'">
            <UiInfo :title="$t('components.Mint.minted')">
              <div class="text-500 text-center font-semibold mb-8 mt-2 w-full">
                {{ mintedAmount ? mintedAmount / Math.pow(10, chainConfig.feeCurrencies[1].coinDecimals) : 0 }} {{ chainConfig.feeCurrencies[1].coinDenom }}
                <br />
                <span class="text-300 font-normal text-grey-100">
                  {{ mintedRate }} {{ chainConfig.feeCurrencies[1].coinDenom }} per {{ chainConfig.feeCurrencies[0].coinDenom }}
                </span>
              </div>
            </UiInfo>

            <button
              class="px-6 py-4 rounded text-light text-300 text-center bg-grey-200 w-full hover:opacity-50 duration-150 ease-in-out"
              @click="toggleModal(false)"
            >
              {{ $t("ui.actions.done") }}
            </button>
          </div>
          <div v-show="displayState === 'error'">
            <UiInfo :title="$t('components.Delegate.error')" type="warning" :circled="true">
              <textarea
                ref="error"
                v-model="errorMsg"
                readonly
                class="w-full h-32 my-4 px-4 pb-4 pt-4 bg-grey-200 text-grey-50 rounded outline-none resize-none"
              ></textarea>
            </UiInfo>

            <button
              class="px-6 py-4 rounded text-light text-300 text-center bg-grey-200 w-full hover:opacity-50 duration-150 ease-in-out"
              @click="toggleModal(false)"
            >
              {{ $t("ui.actions.done") }}
            </button>
          </div>
        </div>
      </div>
    </ModalWrap>
  </div>
</template>
