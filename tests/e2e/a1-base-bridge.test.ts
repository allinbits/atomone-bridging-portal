// @vitest-environment node
import "dotenv/config";

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { describe, expect, it } from "vitest";

import { makeAtoneToEthTransaction } from "@/ics20/a1-eth-hook";
import { BASE_ZKGM_ADDRESS } from "@/ics20/constants";
import routes from "@/routes.json";
import { waitForPacketCompletion, waitForPacketStatus } from "@/union/graphql";

const MNEMONIC = process.env.TEST_MNEMONIC;
const EVM_ADDRESS = process.env.TEST_EVM_ADDRESS;
const ATOMONE_ADDRESS = process.env.TEST_ATOMONE_ADDRESS;
// const OSMOSIS_ADDRESS = process.env.TEST_OSMOSIS_ADDRESS;
const ATOMONE_RPC = process.env.ATOMONE_RPC || "https://atomone-rpc.allinbits.com/";
const AMOUNT = process.env.TEST_AMOUNT || "20000";
const DENOM = process.env.TEST_DENOM || "uatone";

const ONE_MINUTE = 1 * 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

const hasEnv = Boolean(MNEMONIC && EVM_ADDRESS);

describe("AtomOne → Base Bridge E2E", () => {
  it.skipIf(!hasEnv)(
    "bridges uatone from AtomOne to Base via Osmosis + Union ZKGM",
    async () => {
      // --- Wallet setup ---
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC!, {
        prefix: "atone",
      });
      const [account] = await wallet.getAccounts();
      const sender = ATOMONE_ADDRESS || account.address;
      console.log(`Sender: ${sender}`);

      // --- Connect to AtomOne ---
      const client = await SigningStargateClient.connectWithSigner(
        ATOMONE_RPC,
        wallet,
      );

      const balance = await client.getBalance(sender, DENOM);
      console.log(`Balance: ${balance.amount} ${balance.denom}`);
      expect(
        BigInt(balance.amount),
        `Insufficient ${DENOM} balance: need ${AMOUNT}, have ${balance.amount}`,
      ).toBeGreaterThanOrEqual(BigInt(AMOUNT));

      // --- Build bridge transaction ---
      const route = routes.find(
        (r) => r.src === "AtomOne" && r.dest === "Base" && r.denom === DENOM,
      );
      expect(route, `No route found for AtomOne → Base ${DENOM}`).toBeDefined();

      const { hash, ...memo } = await makeAtoneToEthTransaction(
        "atomone",
        "base",
        sender,
        EVM_ADDRESS!,
        BigInt(AMOUNT),
        route!.baseToken,
        route!.quoteToken,
        route!.metadata,
      );

      // --- Broadcast IBC transfer to Osmosis with ZKGM wasm memo ---
      const msg = MsgTransfer.fromPartial({
        sender,
        sourcePort: "transfer",
        sourceChannel: "channel-2",
        token: { denom: DENOM, amount: AMOUNT },
        receiver: BASE_ZKGM_ADDRESS,
        memo: JSON.stringify(memo),
        timeoutHeight: undefined,
        timeoutTimestamp: BigInt(Date.now() + 10 * 60 * 1000) * BigInt(1_000_000),
      });

      const transfer = {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: msg,
      };

      // Fee in uphoton, matching the app's fee structure
      const gasLimit = "250000";
      const fee = {
        amount: [{ amount: Math.ceil(Number(gasLimit) * 0.25) + "", denom: "uphoton" }],
        gas: gasLimit,
      };

      console.log("Broadcasting IBC transfer...");
      const txResult = await client.signAndBroadcast(sender, [transfer], fee);
      console.log(`AtomOne tx: ${txResult.transactionHash} (code: ${txResult.code})`);
      expect(txResult.code, `Tx failed with code ${txResult.code}: ${txResult.rawLog}`).toBe(0);

      // --- Poll Union GraphQL for packet status progression ---
      console.log(`Packet hash (Osmosis → Base): ${hash}`);
      console.log("Waiting for PACKET_RECV...");

      const recvPacket = await waitForPacketStatus(hash, "PACKET_RECV", ONE_MINUTE * 5);
      expect(recvPacket.source_universal_chain_id).toBe("osmosis.osmosis-1");
      console.log("PACKET_RECV confirmed!");
      console.log(`  Packet hash: ${recvPacket.packet_hash}`);
      console.log(`  Send tx:     ${recvPacket.packet_send_transaction_hash}`);
      console.log(`  Recv tx:     ${recvPacket.packet_recv_transaction_hash}`);

      console.log("Waiting for PACKET_ACK...");
      const ackPacket = await waitForPacketCompletion(hash, ONE_HOUR * 3);
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
    },
    ONE_HOUR * 4,
  );
});
