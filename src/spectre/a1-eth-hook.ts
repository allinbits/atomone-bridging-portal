import type { EncodeObject } from "@cosmjs/proto-signing";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";

import { SPECTRE_COSMOS_CLIENT_ID, SPECTRE_ENCODING, SPECTRE_TRANSFER_PORT } from "./constants.ts";
import { SPECTRE_MSG_TRANSFER_TYPE_URL } from "./msgTransferCodec.ts";

/*
 * Absolute-seconds timeout: IBC v2's sendPacket reads this field as Unix SECONDS
 * (time.Unix(ts, 0)) and caps it at block time + 24h (MaxTimeoutDelta), unlike
 * the v1 channel path which treats it as nanoseconds.
 */
export const spectreTimeoutTimestamp = (secondsFromNow = 3600): bigint => BigInt(Math.floor(Date.now() / 1000) + secondsFromNow);

export interface SpectreA1ToEthTransferArgs {

  /** bech32 atone... sender */
  sender: string;

  /** raw 0x... EVM receiver */
  receiver: string;
  denom: string;
  amount: bigint;

  /** timeout offset in seconds, default 1 hour */
  timeoutSeconds?: number;

  /** cosmos-side spectre client id (MsgTransfer.sourceChannel); defaults to devnet */
  sourceChannel?: string;

  /** IBC transfer port; defaults to "transfer" */
  sourcePort?: string;

  /** packet payload encoding marker; defaults to the solidity-ABI marker */
  encoding?: string;
}

/**
 * Builds the EncodeObject for a spectre (IBC v2) AtomOne -> EVM transfer.
 * The value is a full MsgTransfer including the ABI encoding marker (proto
 * field 9) that tells the spectre stack the packet payload is solidity-ABI
 * encoded instead of ics20-1 JSON.
 */
export const makeSpectreA1ToEthTransfer = ({
  sender,
  receiver,
  denom,
  amount,
  timeoutSeconds,
  sourceChannel = SPECTRE_COSMOS_CLIENT_ID,
  sourcePort = SPECTRE_TRANSFER_PORT,
  encoding = SPECTRE_ENCODING
}: SpectreA1ToEthTransferArgs): EncodeObject => {
  const value = MsgTransfer.fromPartial({
    sourcePort,
    sourceChannel,
    token: { denom,
      amount: amount.toString() },
    sender,
    receiver,
    timeoutHeight: undefined,
    timeoutTimestamp: spectreTimeoutTimestamp(timeoutSeconds),
    memo: ""
  });
  return {
    typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
    value: { ...value,
      encoding }
  };
};
