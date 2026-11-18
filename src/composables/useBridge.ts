import { ref } from "vue";

import { useNetwork } from "@/composables/useNetwork";
import { useWallet } from "@/composables/useWallet";
import type { SpectreRoute } from "@/networks";
import { makeSpectreA1ToEthTransfer } from "@/spectre/a1-eth-hook.ts";
import { SPECTRE_DEFAULT_GAS, SPECTRE_GAS_MULTIPLIER, SPECTRE_MIN_FEE_AMOUNT } from "@/spectre/constants.ts";
import { makeSpectreEthToA1Transfer } from "@/spectre/eth-a1-hook.ts";
import { createSpectreSigningClient } from "@/spectre/msgTransferCodec.ts";

import { useEthWallet } from "./useEthWallet.ts";

const findRoute = (routes: SpectreRoute[], src: string, dest: string, denom: string) => routes.find((r) => r.src.toLowerCase() === src.toLowerCase() && r.dest.toLowerCase() === dest.toLowerCase() && denom === r.denom);

const createSpectreCosmosBridge = async (rcpt: string, denom: string, amount: string, loading: { value: boolean }) => {
  const { networkConfig } = useNetwork();
  const { address, signer } = useWallet();
  if (!address.value || !signer.value) {
    throw new Error("Connect your AtomOne wallet first");
  }

  const transfer = makeSpectreA1ToEthTransfer({
    sender: address.value,
    receiver: rcpt,
    denom,
    amount: BigInt(amount),
    sourceChannel: networkConfig.value.cosmos.spectreClientId
  });

  loading.value = true;
  try {
    const client = await createSpectreSigningClient(
      networkConfig.value.cosmos.rpc,
      signer.value
    );
    let gas = SPECTRE_DEFAULT_GAS;
    try {
      const simulated = await client.simulate(
        address.value,
        [transfer],
        ""
      );
      if (simulated > 0) {
        gas = Math.ceil(simulated * SPECTRE_GAS_MULTIPLIER);
      }
    } catch {
      // fall back to the fixed default gas
    }
    const feeAmount = Math.max(
      SPECTRE_MIN_FEE_AMOUNT,
      Math.ceil(gas * 0.25)
    );
    const result = await client.signAndBroadcast(
      address.value,
      [transfer],
      {
        amount: [
          { amount: feeAmount + "",
            denom: networkConfig.value.cosmos.feeDenom }
        ],
        gas: gas + ""
      }
    );
    if (result.code !== 0) {
      throw new Error(`Spectre transfer failed with code ${result.code}: ${result.rawLog}`);
    }
    return { packetHash: result.transactionHash };
  } finally {
    loading.value = false;
  }
};

const createSpectreEvmBridge = async (rcpt: string, amount: string, loading: { value: boolean }) => {
  const { networkConfig } = useNetwork();
  const { walletClient, ensureAllowance, switchChain } = useEthWallet();

  await switchChain(networkConfig.value.evm.chain);

  const { to, data, approveSpender } = makeSpectreEthToA1Transfer({
    baseToken: networkConfig.value.evm.erc20,
    amount: BigInt(amount),
    receiver: rcpt,
    sourceClient: networkConfig.value.evm.clientId,
    ics20: networkConfig.value.evm.ics20
  });

  loading.value = true;
  try {
    await ensureAllowance(
      networkConfig.value.evm.erc20,
      approveSpender,
      BigInt(amount),
      networkConfig.value.evm.chain
    );

    const [account] = await walletClient.value!.getAddresses();

    const hash = await walletClient.value!.sendTransaction({
      account,
      to,
      value: BigInt(0),
      data,
      chain: undefined
    });
    return { packetHash: hash };
  } finally {
    loading.value = false;
  }
};

export const useBridges = () => {
  const loading = ref(false);
  const { networkConfig } = useNetwork();

  const createBridge = async (src: string, dest: string, rcpt: string, denom: string, amount: string) => {
    const route = findRoute(
      networkConfig.value.routes,
      src,
      dest,
      denom
    );
    if (!route) {
      throw new Error(`Bridge from ${src} to ${dest} with denom ${denom} is not supported on ${networkConfig.value.label}.`);
    }
    if (src === "atomone") {
      return createSpectreCosmosBridge(
        rcpt,
        denom,
        amount,
        loading
      );
    }
    return createSpectreEvmBridge(
      rcpt,
      amount,
      loading
    );
  };
  return { createBridge,
    loading };
};
