import { EncodeObject } from "@cosmjs/proto-signing";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { RpcTransactionRequest } from "viem";

import { useWallet } from "@/composables/useWallet";
import { makeAtoneToEthTransaction } from "@/ics20/a1-eth-hook.ts";
import { BASE_ZKGM_ADDRESS, ETH_ZKGM_ADDRESS } from "@/ics20/constants.ts";
import { makeEthToAtoneTransaction } from "@/ics20/eth-a1-hook.ts";
import routes from "@/routes.json";

import { type SupportedChain, useEthWallet } from "./useEthWallet.ts";

const buildBridgeInfo = async (src: string, dest: string, rcpt: string, sender: string, denom: string, amount: string) => {
  const route = routes.find((r) => r.src.toLowerCase() === src.toLowerCase() && r.dest.toLowerCase() === dest.toLowerCase() && denom === r.denom);
  if (!route) {
    throw new Error(`Bridge from ${src} to ${dest} with denom ${denom} is not supported.`);
  }
  if (src === "atomone") {
    const { hash, ...memo } = await makeAtoneToEthTransaction(
      src,
      dest,
      sender,
      rcpt,
      BigInt(amount),
      route.baseToken,
      route.quoteToken,
      route.metadata
    );

    return { memo,
      hash,
      baseToken: route.baseToken,
      receiver: dest === "ethereum"
        ? ETH_ZKGM_ADDRESS
        : BASE_ZKGM_ADDRESS };
  } else {
    const tx = await makeEthToAtoneTransaction(
      src,
      dest,
      sender,
      rcpt,
      BigInt(amount),
      route.baseToken,
      route.quoteToken,
      route.metadata
    );
    return { memo: tx,
      baseToken: route.baseToken,
      receiver: tx.to as string };
  }
};

export const useBridges = () => {
  const createBridge = async (src: string, dest: string, rcpt: string, denom: string, amount: string) => {
    if (src === "atomone") {
      const { sendTx, address } = useWallet();
      const { memo, receiver, hash } = await buildBridgeInfo(
        src,
        dest,
        rcpt,
        address.value,
        denom,
        amount
      );
      console.log({ memo,
        receiver,
        denom,
        amount });

      console.log(hash);
      const msg = MsgTransfer.fromPartial({
        sender: address.value,
        sourcePort: "transfer",
        sourceChannel: "channel-2",
        token: {
          denom,
          amount: amount + ""
        },
        receiver,
        memo: JSON.stringify(memo),
        timeoutHeight: undefined,
        timeoutTimestamp: BigInt(Date.now() + 10 * 60 * 1000) * BigInt(1_000_000) // 10 minutes from now
      });
      const transfer: EncodeObject = {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: msg
      };
      console.log(transfer);

      return sendTx([transfer]);
    }
    if (src === "ethereum" || src === "base") {
      const { address, walletClient, ensureAllowance, switchChain } = useEthWallet();

      await switchChain(src as SupportedChain);

      const { memo, receiver, baseToken } = await buildBridgeInfo(
        src,
        dest,
        rcpt,
        address.value,
        denom,
        amount
      );
      console.log({ memo,
        receiver,
        denom,
        amount });

      if (baseToken.startsWith("0x")) {
        await ensureAllowance(
          baseToken as `0x${string}`,
          receiver as `0x${string}`,
          BigInt(amount),
          src as SupportedChain
        );
      }

      const [account] = await walletClient.value!.getAddresses();

      return walletClient.value?.sendTransaction({
        to: receiver as `0x${string}`,
        value: BigInt(0),
        data: (memo as RpcTransactionRequest).data,
        account,
        chain: undefined
      });
    }
  };
  return { createBridge };
};
