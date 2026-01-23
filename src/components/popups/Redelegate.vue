<script setup lang="ts">
import { DeliverTxResponse } from "@cosmjs/stargate";
import { useQueryClient } from "@tanstack/vue-query";
import { useClipboard } from "@vueuse/core";
import BigNumber from "bignumber.js";
import { MsgBeginRedelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { computed, ref } from "vue";

import chainConfig from "@/chain-config.json";
import ModalWrap from "@/components/common/ModalWrap.vue";
import CommonButton from "@/components/ui/CommonButton.vue";
import Icon from "@/components/ui/Icon.vue";
import UiInfo from "@/components/ui/UiInfo.vue";
import UiInput from "@/components/ui/UiInput.vue";
import { useValidators } from "@/composables/useValidators";
import { useWallet, Wallets } from "@/composables/useWallet";
import { shorten, toPlainObjectString } from "@/utility";

import DropDown from "../ui/DropDown.vue";
// Get QueryClient from the context
const queryClient = useQueryClient();

interface Props {
  validatorAddress: string;
  delegationAmount: bigint;
  validatorList: {
    description: { moniker: string };
    operator_address: string;
    status: string;
  }[];
}
const props = defineProps<Props>();

const isOpen = ref(false);
const displayState = ref<"delegated" | "CLI" | "pending" | "error">("pending");

const redelegationAmount = ref<number | null>(null);
const errorMsg = ref<string>("");
const cliDelegationInput = ref("");
const transacting = ref<boolean>(false);
const delegationDenomDecimals = computed(() => {
  return chainConfig.stakeCurrency.coinDecimals;
});

const delegationDenomDisplay = computed(() => {
  return chainConfig.stakeCurrency.coinDenom;
});

const resetDeposit = () => redelegationAmount.value = null;

const toggleModal = (dir: boolean) => {
  isOpen.value = dir;
  displayState.value = "pending";
  resetDeposit();
};

const { beginRedelegation } = useValidators();
const { used } = useWallet();
const validatorIndex = ref<number>(0);
const validatorDstAddress = computed(() => {
  return props.validatorList[validatorIndex.value].operator_address;
});
const signRedelegation = async (isCLI = false) => {
  if (!redelegationAmount.value || redelegationAmount.value <= 0) return;
  if (!props.validatorAddress) return;

  const redelegationOptions: Partial<MsgBeginRedelegate> = {
    validatorSrcAddress: props.validatorAddress,
    validatorDstAddress: validatorDstAddress.value,
    amount: {
      denom: chainConfig.stakeCurrency.coinMinimalDenom,
      amount:
        BigNumber(redelegationAmount.value).
          multipliedBy(10 ** delegationDenomDecimals.value).
          toFixed(0) ?? ""
    }
  };
  try {
    transacting.value = true;
    const depot = await beginRedelegation(
      redelegationOptions,
      isCLI
    );
    if ((depot as DeliverTxResponse).code !== 0 && !isCLI) {
      transacting.value = false;
      errorMsg.value = (depot as DeliverTxResponse).rawLog ?? toPlainObjectString(depot);
      displayState.value = "error";
    } else {
      transacting.value = false;
      cliDelegationInput.value = (isCLI
        ? depot
        : "") as string;
      displayState.value = isCLI
        ? "CLI"
        : "delegated";
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
      queryClient.invalidateQueries({ queryKey: ["validators"] });
    }
  } catch (e) {
    console.log(e);
    errorMsg.value = "" + e;
    transacting.value = false;
    displayState.value = "error";
  }
};
const handleValChange = (index: number) => {
  validatorIndex.value = index;
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
        {{ $t("components.Redelegate.cta") }}
      </div>
    </div>

    <ModalWrap :visible="isOpen">
      <div class="bg-grey-400 w-full rounded-md max-h-screen overflow-auto">
        <div class="px-10 py-12 bg-grey-400 rounded w-screen max-w-[40rem]">
          <div v-show="displayState === 'pending'" class="flex flex-col gap-6 relative">
            <span class="text-gradient font-termina text-700 text-center">{{ $t("components.Redelegate.cta") }}</span>
            <div class="flex flex-col gap-10">
              <div>
                <div class="flex flex-col gap-10">
                  <form class="flex flex-col items-center gap-2">
                    <UiInput
                      v-model="redelegationAmount"
                      type="number"
                      placeholder="e.g. 50"
                      label="Amount to redelegate"
                      :min="0"
                      :max="Number(delegationAmount) / Math.pow(10, delegationDenomDecimals)"
                      class="w-full justify-end"
                    />
                    <div class="w-full flex flex-col ml-1 mt-3">
                      <span>Redelegate to:</span>
                      <DropDown
                        :items="
                          validatorList.map((x) => ({
                            name: x.description.moniker + ' (' + shorten(x.operator_address) + ')',
                            status: x.status
                          }))
                        "
                        :model-value="validatorIndex"
                        @select="handleValChange"
                      />
                    </div>
                  </form>
                </div>
              </div>

              <div v-if="!transacting" class="flex flex-col gap-4">
                <div v-show="(redelegationAmount ?? -1) > 0" class="flex flex-col gap-4">
                  <button
                    class="px-6 py-4 rounded link-gradient text-dark text-300 text-center w-full"
                    @click="signRedelegation(true)"
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
                    @click="signRedelegation()"
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
              <span class="text-gradient font-termina text-700 text-center">{{ $t("components.Redelegate.cta") }}</span>
              <span class="text-grey-100">{{ $t("ui.actions.clicta") }}</span>
            </div>

            <div class="relative">
              <button
                v-if="isClipboardSupported"
                class="absolute top-4 right-4 text-200 hover:text-grey-50 duration-200"
                @click="copy(cliDelegationInput)"
              >
                <span v-show="copied">{{ $t("ui.actions.copied") }}</span>
                <span v-show="!copied" class="flex gap-1">
                  <Icon icon="copy" /><span>{{ $t("ui.actions.copy") }}</span>
                </span>
              </button>
              <textarea
                ref="CLIVote"
                v-model="cliDelegationInput"
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
          <div v-show="displayState === 'delegated'">
            <UiInfo :title="$t('components.Redelegate.redelegated')">
              <div class="text-500 text-center font-semibold mb-8 w-full">
                {{ redelegationAmount }} {{ delegationDenomDisplay }}
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
            <UiInfo :title="$t('components.Redelegate.error')" type="warning" :circled="true">
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
