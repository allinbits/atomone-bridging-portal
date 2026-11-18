import { decodeFunctionData, getFunctionSelector, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import { SPECTRE_ERC20_ADDRESS, SPECTRE_ICS20_ADDRESS } from "@/spectre/constants";
import { ICS20_SEND_TRANSFER_ABI, makeSpectreEthToA1Transfer } from "@/spectre/eth-a1-hook";

const CANONICAL_SIGNATURE = "sendTransfer((address,uint256,string,string,string,uint64,string))";

const RECEIVER = "atone1abcdefghijklmnopqrstuvwxyz0123456789";

describe(
  "makeSpectreEthToA1Transfer",
  () => {
    it(
      "produces calldata with the sendTransfer selector",
      () => {
        const { data } = makeSpectreEthToA1Transfer({
          baseToken: SPECTRE_ERC20_ADDRESS,
          amount: 1000000n,
          receiver: RECEIVER
        });

        const expectedSelector = getFunctionSelector(CANONICAL_SIGNATURE);
        expect(data.slice(
          0,
          10
        )).toBe(expectedSelector);
      }
    );

    it(
      "decodes back to the transfer tuple",
      () => {
        const before = Math.floor(Date.now() / 1000);
        const { data } = makeSpectreEthToA1Transfer({
          baseToken: SPECTRE_ERC20_ADDRESS,
          amount: 1000000n,
          receiver: RECEIVER
        });
        const after = Math.floor(Date.now() / 1000);

        const { functionName, args } = decodeFunctionData({
          abi: ICS20_SEND_TRANSFER_ABI,
          data: data as Hex
        });

        expect(functionName).toBe("sendTransfer");
        const transfer = args[0] as {
          baseToken: string;
          amount: bigint;
          receiver: string;
          sourceClient: string;
          destPort: string;
          timeoutTimestamp: bigint;
          memo: string;
        };
        expect(transfer.baseToken.toLowerCase()).toBe(SPECTRE_ERC20_ADDRESS.toLowerCase());
        expect(transfer.amount).toBe(1000000n);
        expect(transfer.receiver).toBe(RECEIVER);
        expect(transfer.sourceClient).toBe("atomone-1");
        expect(transfer.destPort).toBe("transfer");
        expect(transfer.memo).toBe("");
        // timeout is in SECONDS on the EVM side
        expect(transfer.timeoutTimestamp).toBeGreaterThanOrEqual(BigInt(before + 3600));
        expect(transfer.timeoutTimestamp).toBeLessThanOrEqual(BigInt(after + 3600));
      }
    );

    it(
      "targets the ICS20 contract and exposes it as the approve spender",
      () => {
        const { to, approveSpender } = makeSpectreEthToA1Transfer({
          baseToken: SPECTRE_ERC20_ADDRESS,
          amount: 1n,
          receiver: RECEIVER
        });

        expect(to.toLowerCase()).toBe(SPECTRE_ICS20_ADDRESS.toLowerCase());
        expect(approveSpender.toLowerCase()).toBe(SPECTRE_ICS20_ADDRESS.toLowerCase());
      }
    );
  }
);
