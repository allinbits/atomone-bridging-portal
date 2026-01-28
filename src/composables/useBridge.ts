import { useWallet } from "@/composables/useWallet";
import { makeAtoneToEthTransaction } from "@/ics20/a1-eth-hook.ts";
import { BASE_ZKGM_ADDRESS, ETH_ZKGM_ADDRESS } from "@/ics20/constants.ts";
import { makeEthToAtoneTransaction } from "@/ics20/eth-a1-hook.ts";
import routes from "@/routes.json";

const buildBridgeInfo = async (src: string, dest: string, rcpt: string, sender: string, denom: string, amount: string) => {
  const route = routes.find((r) => r.src.toLowerCase() === src.toLowerCase() && r.dest.toLowerCase() === dest.toLowerCase() && denom === r.denom);
  if (!route) {
    throw new Error(`Bridge from ${src} to ${dest} with denom ${denom} is not supported.`);
  }
  if (src === "atomone") {
    return { memo: await makeAtoneToEthTransaction(
      src,
      dest,
      sender,
      rcpt,
      BigInt(amount),
      route.baseToken,
      route.quoteToken,
      route.metadata
    ),
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
      receiver: tx.to as string };
  }
};

export const useBridges = () => {
  const createBridge = async (src: string, dest: string, rcpt: string, denom: string, amount: string) => {
    const { address } = useWallet();
    const { memo, receiver } = await buildBridgeInfo(
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

    /*
     *const msg = MsgTransfer.fromPartial({
     *  sender: address.value,
     *  sourcePort: "transfer",
     *  sourceChannel: "channel-2",
     *  token: {
     *    denom,
     *    amount: amount + ""
     *  },
     *  receiver,
     *  memo: JSON.stringify(memo),
     *  timeoutHeight: undefined,
     *  timeoutTimestamp: BigInt(Date.now() + 10 * 60 * 1000) * BigInt(1_000_000) // 10 minutes from now
     *});
     *const transfer: EncodeObject = {
     *  typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
     *  value: msg
     *};
     *console.log(transfer);
     */
    // return sendTx([transfer]);
  };
  return { createBridge };
};
