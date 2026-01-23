
import { EncodeObject } from "@cosmjs/proto-signing";
import { Ucs05 } from "@unionlabs/sdk";
import { Bech32, ERC55 } from "@unionlabs/sdk/Ucs05";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";

import { useWallet } from "@/composables/useWallet";
import { makeAtoneIcs20PacketMemo, makePhotonIcs20PacketMemo } from "@/ics20/a1-eth-hook.ts";


const buildBridgeInfo = async (src: string, dest: string, rcpt: string, sender: string, denom: string, amount: string) => {
  if (src === "atomone" && dest === "ethereum") {
    if (denom === "uatone") {
      const memo = await makeAtoneIcs20PacketMemo({
        sender: Ucs05.CosmosDisplay.make({
          address: sender as Bech32
        }),
        receiver: Ucs05.EvmDisplay.make({
          address: rcpt as ERC55
        }),
        amount: BigInt(amount)
      });
      return {
        memo,
        receiver: "osmo1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292qs2uecc" // ZKGM address on Osmosis
      };
    }
    if (denom === "uphoton") {
      const memo = await makePhotonIcs20PacketMemo({
        sender: Ucs05.CosmosDisplay.make({
          address: sender as Bech32
        }),
        receiver: Ucs05.EvmDisplay.make({
          address: rcpt as ERC55
        }),
        amount: BigInt(amount)
      });
      return {
        memo,
        receiver: "osmo1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292qs2uecc" // ZKGM address on Osmosis
      };
    }
  }
  throw new Error(`Bridge from ${src} to ${dest} is not supported yet.`);
};

export const useBridges = () => {
  const createBridge = async (src: string, dest: string, rcpt: string, denom: string, amount: string) => {
    const { sendTx, address } = useWallet();
    const { memo, receiver } = await buildBridgeInfo(
      src,
      dest,
      rcpt,
      address.value,
      denom,
      amount
    );
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
  };
  return { createBridge };
};
