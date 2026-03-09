// @vitest-environment node
import "dotenv/config";

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { describe, expect, it } from "vitest";

import { makeAtoneToEthTransaction } from "@/ics20/a1-eth-hook";
import { BASE_ZKGM_ADDRESS } from "@/ics20/constants";
import routes from "@/routes.json";
import { waitForPacketCompletion, waitForPacketStatus } from "@/union/graphql";

import { withFileLock } from "./_file-lock";

const MNEMONIC = process.env.TEST_MNEMONIC;
const EVM_ADDRESS = process.env.TEST_EVM_ADDRESS;
// const OSMOSIS_ADDRESS = process.env.TEST_OSMOSIS_ADDRESS;
const ATOMONE_RPC = process.env.ATOMONE_RPC || "https://atomone-rpc.allinbits.com/";
const AMOUNT = process.env.TEST_AMOUNT || "4242";
const DENOM = process.env.TEST_DENOM || "uatone";
const TEST_ENABLE_WAIT_FOR_ACK = process.env.TEST_ENABLE_WAIT_FOR_ACK === "true";

const ONE_MINUTE = 1 * 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const MAX_SEQUENCE_RETRIES = Number(process.env.TEST_SEQUENCE_RETRIES ?? "3");
const TEST_TX_BROADCAST_TIMEOUT_MS = Number(process.env.TEST_TX_BROADCAST_TIMEOUT_MS ?? "240000");
const TEST_TX_BROADCAST_POLL_INTERVAL_MS = Number(process.env.TEST_TX_BROADCAST_POLL_INTERVAL_MS ?? "3000");
const TEST_TX_POST_SUBMIT_LOOKUP_TIMEOUT_MS = Number(process.env.TEST_TX_POST_SUBMIT_LOOKUP_TIMEOUT_MS ?? "240000");
const TEST_TX_POST_SUBMIT_LOOKUP_POLL_INTERVAL_MS = Number(process.env.TEST_TX_POST_SUBMIT_LOOKUP_POLL_INTERVAL_MS ?? "3000");

const hasEnv = Boolean(MNEMONIC && EVM_ADDRESS);

describe(
  "AtomOne → Base Bridge E2E",
  () => {
    it.skipIf(!hasEnv)(
      "bridges uatone from AtomOne to Base via Osmosis + Union ZKGM",
      async () => {
      // --- Wallet setup ---
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
          MNEMONIC!,
          {
            prefix: "atone"
          }
        );
        const [account] = await wallet.getAccounts();
        const sender = account.address;
        console.log(`Sender: ${sender}`);

        // --- Connect to AtomOne ---
        const client = await SigningStargateClient.connectWithSigner(
          ATOMONE_RPC,
          wallet
        );

        const balance = await client.getBalance(
          sender,
          DENOM
        );
        console.log(`Balance: ${balance.amount} ${balance.denom}`);
        expect(
          BigInt(balance.amount),
          `Insufficient ${DENOM} balance: need ${AMOUNT}, have ${balance.amount}`
        ).toBeGreaterThanOrEqual(BigInt(AMOUNT));

        // --- Build bridge transaction ---
        const route = routes.find((r) => r.src === "AtomOne" && r.dest === "Base" && r.denom === DENOM);
        expect(
          route,
          `No route found for AtomOne → Base ${DENOM}`
        ).toBeDefined();

        const { hash, ...memo } = await makeAtoneToEthTransaction(
          "atomone",
          "base",
          sender,
          EVM_ADDRESS!,
          BigInt(AMOUNT),
          route!.baseToken,
          route!.quoteToken,
          route!.metadata
        );

        // --- Broadcast IBC transfer to Osmosis with ZKGM wasm memo ---
        const msg = MsgTransfer.fromPartial({
          sender,
          sourcePort: "transfer",
          sourceChannel: "channel-2",
          token: { denom: DENOM,
            amount: AMOUNT },
          receiver: BASE_ZKGM_ADDRESS,
          memo: JSON.stringify(memo),
          timeoutHeight: undefined,
          timeoutTimestamp: BigInt(Date.now() + 10 * 60 * 1000) * BigInt(1_000_000)
        });

        const transfer = {
          typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
          value: msg
        };

        // Slightly higher gas/fee to improve tx inclusion speed under load.
        const gasLimit = "400000";
        const fee = {
          amount: [
            { amount: Math.ceil(Number(gasLimit) * 0.5) + "",
              denom: "uphoton" }
          ],
          gas: gasLimit
        };

        const txResult = await withFileLock(
          "atomone-sequence",
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
              console.log(`Signing with accountNumber=${accountNumber}, sequence=${sequence}`);

              const signedTx = await client.sign(
                sender,
                [transfer],
                fee,
                "",
                {
                  accountNumber,
                  sequence,
                  chainId
                }
              );
              const txBytes = TxRaw.encode(signedTx).finish();

              console.log("Broadcasting IBC transfer...");
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
                const isSubmittedButNotIndexed =
                  message.includes("was submitted but was not yet found on the chain");
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
                  throw new Error(`Transaction ${transactionHash} was submitted but not indexed within ` +
                    `${TEST_TX_POST_SUBMIT_LOOKUP_TIMEOUT_MS}ms`);
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
        // --- Poll Union GraphQL for packet status progression ---
        console.log(`Packet hash (Osmosis → Base): ${hash}`);
        console.log("Waiting for PACKET_RECV...");
        const recvPacket = await waitForPacketStatus(
          hash,
          "PACKET_RECV",
          ONE_MINUTE * 5
        );
        expect(recvPacket.source_universal_chain_id).toBe("osmosis.osmosis-1");
        console.log("PACKET_RECV confirmed!");
        console.log(`  Packet hash: ${recvPacket.packet_hash}`);
        console.log(`  Send tx:     ${recvPacket.packet_send_transaction_hash}`);
        console.log(`  Recv tx:     ${recvPacket.packet_recv_transaction_hash}`);

        if (TEST_ENABLE_WAIT_FOR_ACK) {
          console.log("Waiting for PACKET_ACK...");
          const ackPacket = await waitForPacketCompletion(
            hash,
            ONE_HOUR * 3
          );
          expect(ackPacket.status).toBe("PACKET_ACK");
          console.log("PACKET_ACK confirmed — bridge completed successfully!");
          console.log(`  Packet hash: ${ackPacket.packet_hash}`);
          console.log(`  Send tx:     ${ackPacket.packet_send_transaction_hash}`);
          console.log(`  Recv tx:     ${ackPacket.packet_recv_transaction_hash}`);
          console.log(`  Ack tx:      ${ackPacket.packet_ack_transaction_hash}`);
          if (ackPacket.traces?.length) {
            console.log(`  Traces (${ackPacket.traces.length}):`);
            for (const trace of ackPacket.traces) {
              console.log(`    ${trace.type} @ ${trace.chain.universal_chain_id} (height ${trace.height})`);
            }
          }
        } else {
          console.log("Skipping PACKET_ACK wait (TEST_ENABLE_WAIT_FOR_ACK=false)");
        }
      },
      ONE_HOUR * 4
    );
  }
);
