// @vitest-environment node
import "dotenv/config";

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { createPublicClient, erc20Abi, http } from "viem";
import { sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import { makeSpectreA1ToEthTransfer } from "@/spectre/a1-eth-hook";
import { SPECTRE_COSMOS_CLIENT_ID, SPECTRE_COSMOS_FEE_DENOM, SPECTRE_COSMOS_RPC, SPECTRE_WRAPPED_UATONE_ADDRESS } from "@/spectre/constants";
import { createSpectreSigningClient } from "@/spectre/msgTransferCodec";

import { withFileLock } from "./_file-lock";

const MNEMONIC = process.env.TEST_MNEMONIC;
const EVM_ADDRESS = process.env.TEST_EVM_ADDRESS;
const ATOMONE_RPC = process.env.ATOMONE_RPC || SPECTRE_COSMOS_RPC;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || process.env.VITE_TEST_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
const AMOUNT = process.env.TEST_AMOUNT || "1000000";
const DENOM = process.env.TEST_DENOM || "uatone";
const TEST_ENABLE_WAIT_FOR_ACK = process.env.TEST_ENABLE_WAIT_FOR_ACK === "true";

const ONE_MINUTE = 1 * 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
// IBC v2 finality on Sepolia takes up to ~15 minutes; keep a generous budget.
const ACK_TIMEOUT_MS = 25 * ONE_MINUTE;
const ACK_POLL_INTERVAL_MS = 15_000;

const MAX_SEQUENCE_RETRIES = Number(process.env.TEST_SEQUENCE_RETRIES ?? "3");
const TEST_TX_BROADCAST_TIMEOUT_MS = Number(process.env.TEST_TX_BROADCAST_TIMEOUT_MS ?? "240000");
const TEST_TX_BROADCAST_POLL_INTERVAL_MS = Number(process.env.TEST_TX_BROADCAST_POLL_INTERVAL_MS ?? "3000");
const TEST_TX_POST_SUBMIT_LOOKUP_TIMEOUT_MS = Number(process.env.TEST_TX_POST_SUBMIT_LOOKUP_TIMEOUT_MS ?? "240000");
const TEST_TX_POST_SUBMIT_LOOKUP_POLL_INTERVAL_MS = Number(process.env.TEST_TX_POST_SUBMIT_LOOKUP_POLL_INTERVAL_MS ?? "3000");

// Gas/fee verified against the devnet: gas 300000 and fee 100000uphoton work.
const GAS_LIMIT = "300000";
const FEE_AMOUNT = "100000";

const hasEnv = Boolean(MNEMONIC && EVM_ADDRESS);

describe(
  "AtomOne → Sepolia (spectre) Bridge E2E",
  () => {
    it.skipIf(!hasEnv)(
      "bridges uatone from AtomOne to Sepolia via the spectre IBC v2 path",
      async () => {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
          MNEMONIC!,
          { prefix: "atone" }
        );
        const [account] = await wallet.getAccounts();
        const sender = account.address;
        console.log(`Sender: ${sender}`);
        console.log(`Receiver (EVM): ${EVM_ADDRESS}`);
        console.log(`RPC: ${ATOMONE_RPC}`);

        const client = await createSpectreSigningClient(
          ATOMONE_RPC,
          wallet
        );

        const balance = await client.getBalance(
          sender,
          DENOM
        );
        const feeBalance = await client.getBalance(
          sender,
          SPECTRE_COSMOS_FEE_DENOM
        );
        console.log(`Balance: ${balance.amount} ${balance.denom}, fee: ${feeBalance.amount} ${feeBalance.denom}`);
        expect(
          BigInt(balance.amount),
          `Insufficient ${DENOM} balance: need ${AMOUNT}, have ${balance.amount}`
        ).toBeGreaterThanOrEqual(BigInt(AMOUNT));
        expect(
          BigInt(feeBalance.amount),
          `Insufficient ${SPECTRE_COSMOS_FEE_DENOM} for fees: need ${FEE_AMOUNT}, have ${feeBalance.amount}`
        ).toBeGreaterThanOrEqual(BigInt(FEE_AMOUNT));

        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http(SEPOLIA_RPC)
        });
        const balanceBefore = await publicClient.readContract({
          address: SPECTRE_WRAPPED_UATONE_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [EVM_ADDRESS as `0x${string}`]
        });
        console.log(`Wrapped uatone balance before: ${balanceBefore}`);

        const transfer = makeSpectreA1ToEthTransfer({
          sender,
          receiver: EVM_ADDRESS!,
          denom: DENOM,
          amount: BigInt(AMOUNT)
        });
        console.log(`sourceChannel: ${SPECTRE_COSMOS_CLIENT_ID}`);

        const fee = {
          amount: [
            { amount: FEE_AMOUNT,
              denom: SPECTRE_COSMOS_FEE_DENOM }
          ],
          gas: GAS_LIMIT
        };

        const txResult = await withFileLock(
          "atomone-spectre-sequence",
          async () => {
            let result:
              | {
                code: number;
                rawLog: string;
                transactionHash: string;
              } |
              undefined;

            for (let attempt = 1; attempt <= MAX_SEQUENCE_RETRIES; attempt++) {
              console.log(`Fetching chain/account sequence (attempt ${attempt}/${MAX_SEQUENCE_RETRIES})...`);
              const [
                { accountNumber, sequence },
                chainId
              ] = await Promise.all([
                client.getSequence(sender),
                client.getChainId()
              ]);
              console.log(`Signing with accountNumber=${accountNumber}, sequence=${sequence}, chainId=${chainId}`);

              const signedTx = await client.sign(
                sender,
                [transfer],
                fee,
                "",
                { accountNumber,
                  sequence,
                  chainId }
              );
              const txBytes = TxRaw.encode(signedTx).finish();

              console.log("Broadcasting spectre IBC v2 transfer...");
              let transactionHash: string | undefined;
              let code: number | undefined;
              let rawLog = "";

              try {
                const broadcastResult = await client.broadcastTx(
                  txBytes,
                  TEST_TX_BROADCAST_TIMEOUT_MS,
                  TEST_TX_BROADCAST_POLL_INTERVAL_MS
                );
                transactionHash = broadcastResult.transactionHash;
                code = broadcastResult.code;
                rawLog = broadcastResult.rawLog ?? "";
              } catch (error) {
                const message = error instanceof Error
                  ? error.message
                  : String(error);
                const isSubmittedButNotIndexed = message.includes("was submitted but was not yet found on the chain");
                if (!isSubmittedButNotIndexed) {
                  throw error;
                }

                const txHashMatch = message.match(/Transaction with ID ([A-F0-9]+)/);
                transactionHash = txHashMatch?.[1];
                if (!transactionHash) {
                  throw error;
                }

                console.log(`Broadcast timeout after submit, polling RPC for tx ${transactionHash}...`);
                const startedAt = Date.now();
                while (Date.now() - startedAt < TEST_TX_POST_SUBMIT_LOOKUP_TIMEOUT_MS) {
                  const indexedTx = await client.getTx(transactionHash);
                  if (indexedTx) {
                    code = indexedTx.code;
                    rawLog = indexedTx.rawLog ?? "";
                    break;
                  }
                  await new Promise((resolve) => setTimeout(
                    resolve,
                    TEST_TX_POST_SUBMIT_LOOKUP_POLL_INTERVAL_MS
                  ));
                }

                if (code === undefined) {
                  throw new Error(`Transaction ${transactionHash} was submitted but not indexed within ${TEST_TX_POST_SUBMIT_LOOKUP_TIMEOUT_MS}ms`);
                }
              }

              if (!transactionHash || code === undefined) {
                throw new Error("Broadcast result is missing transaction hash or code");
              }
              result = { transactionHash,
                code,
                rawLog };
              const resultRawLog = result.rawLog ?? "";
              const isSequenceMismatch =
                result.code === 32 || resultRawLog.toLowerCase().includes("account sequence mismatch");
              if (!isSequenceMismatch || attempt === MAX_SEQUENCE_RETRIES) {
                break;
              }

              const waitMs = 4000 * attempt;
              console.log(`Sequence mismatch detected, retrying in ${waitMs}ms...`);
              await new Promise((resolve) => setTimeout(
                resolve,
                waitMs
              ));
            }

            if (!result) {
              throw new Error("Broadcast result is missing");
            }
            return result;
          }
        );

        console.log(`AtomOne tx: ${txResult.transactionHash} (code: ${txResult.code})`);
        expect(
          txResult.code,
          `Tx failed with code ${txResult.code}: ${txResult.rawLog}`
        ).toBe(0);

        if (TEST_ENABLE_WAIT_FOR_ACK) {
          console.log(`Waiting up to ${ACK_TIMEOUT_MS / ONE_MINUTE} minutes for the wrapped uatone balance to increase on Sepolia...`);
          const startedAt = Date.now();
          let balanceAfter = balanceBefore;
          while (Date.now() - startedAt < ACK_TIMEOUT_MS) {
            balanceAfter = await publicClient.readContract({
              address: SPECTRE_WRAPPED_UATONE_ADDRESS,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [EVM_ADDRESS as `0x${string}`]
            });
            if (balanceAfter > balanceBefore) {
              break;
            }
            await new Promise((resolve) => setTimeout(
              resolve,
              ACK_POLL_INTERVAL_MS
            ));
          }
          console.log(`Wrapped uatone balance after: ${balanceAfter}`);
          expect(
            balanceAfter,
            `Wrapped uatone balance did not increase within ${ACK_TIMEOUT_MS / ONE_MINUTE} minutes (finality on Sepolia can take ~15 minutes)`
          ).toBeGreaterThan(balanceBefore);
          console.log("Spectre bridge completed successfully!");
        } else {
          console.log("Skipping balance wait (TEST_ENABLE_WAIT_FOR_ACK=false)");
        }
      },
      ONE_HOUR
    );
  }
);
