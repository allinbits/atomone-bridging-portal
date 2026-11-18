import { encodeFunctionData, type Hex, parseAbi } from "viem";

import { SPECTRE_EVM_CLIENT_ID, SPECTRE_ICS20_ADDRESS, SPECTRE_TRANSFER_PORT } from "./constants.ts";

/** ICS20 sendTransfer: canonical signature sendTransfer((address,uint256,string,string,string,uint64,string)) */
export const ICS20_SEND_TRANSFER_ABI = parseAbi(["function sendTransfer((address baseToken, uint256 amount, string receiver, string sourceClient, string destPort, uint64 timeoutTimestamp, string memo) transfer)"]);

export interface SpectreEthToA1TransferArgs {
  baseToken: `0x${string}`;
  amount: bigint;

  /** bech32 atone... receiver */
  receiver: string;

  /** timeout offset in seconds (IBC v2 uses Unix seconds on both sides), default 1 hour */
  timeoutSeconds?: number;

  /** EVM-side client id registered in the ICS26 router; defaults to devnet */
  sourceClient?: string;

  /** destination IBC port; defaults to "transfer" */
  destPort?: string;

  /** ICS20 contract address; defaults to devnet */
  ics20?: `0x${string}`;
}

export interface SpectreEthToA1Transfer {
  to: `0x${string}`;
  data: Hex;

  /** address the ERC20 must be approved for before sending (the ICS20 contract) */
  approveSpender: `0x${string}`;
}

/*
 * Encodes the ICS20 sendTransfer call for a spectre (IBC v2) EVM -> AtomOne
 * transfer. The timeout is Unix seconds, matching the cosmos side (IBC v2
 * reads packet timeouts as seconds, unlike the v1 nanoseconds convention).
 */
export const makeSpectreEthToA1Transfer = ({
  baseToken,
  amount,
  receiver,
  timeoutSeconds,
  sourceClient = SPECTRE_EVM_CLIENT_ID,
  destPort = SPECTRE_TRANSFER_PORT,
  ics20 = SPECTRE_ICS20_ADDRESS
}: SpectreEthToA1TransferArgs): SpectreEthToA1Transfer => {
  const timeoutTimestamp = BigInt(Math.floor(Date.now() / 1000) + (timeoutSeconds ?? 3600));

  const data = encodeFunctionData({
    abi: ICS20_SEND_TRANSFER_ABI,
    functionName: "sendTransfer",
    args: [
      {
        baseToken,
        amount,
        receiver,
        sourceClient,
        destPort,
        timeoutTimestamp,
        memo: ""
      }
    ]
  });

  return {
    to: ics20,
    data,
    approveSpender: ics20
  };
};
