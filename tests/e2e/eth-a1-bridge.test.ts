// @vitest-environment node
import "dotenv/config";

import { describe, expect, it } from "vitest";
import { createWalletClient, erc20Abi, http, publicActions, type RpcTransactionRequest } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

import { makeEthToAtoneTransaction } from "@/ics20/eth-a1-hook";
import routes from "@/routes.json";
import { waitForPacketCompletion, waitForPacketStatus } from "@/union/graphql";

const MNEMONIC = process.env.TEST_MNEMONIC;
const ATOMONE_ADDRESS = process.env.TEST_ATOMONE_ADDRESS;
const ETH_RPC = process.env.ETH_RPC || "https://ethereum-rpc.publicnode.com";
const AMOUNT = process.env.TEST_AMOUNT || "4200";
const DENOM = process.env.TEST_DENOM || "uatone";

const ONE_MINUTE = 1 * 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

const hasEnv = Boolean(MNEMONIC && ATOMONE_ADDRESS);

describe("Ethereum → AtomOne Bridge E2E", () => {
  it.skipIf(!hasEnv)(
    "bridges tokens from Ethereum to AtomOne via Osmosis + Union ZKGM",
    async () => {
      const account = mnemonicToAccount(MNEMONIC!);
      const sender = account.address;
      console.log(`Sender (EVM): ${sender}`);

      const client = createWalletClient({
        account,
        chain: mainnet,
        transport: http(ETH_RPC),
      }).extend(publicActions);

      const ethBalance = await client.getBalance({ address: sender });
      console.log(`ETH Balance: ${ethBalance}`);
      expect(ethBalance, "Insufficient ETH balance for gas").toBeGreaterThan(0n);

      const route = routes.find(
        (r) => r.src === "Ethereum" && r.dest === "AtomOne" && r.denom === DENOM,
      );
      expect(route, `No route found for Ethereum → AtomOne ${DENOM}`).toBeDefined();

      const { hash, ...tx } = await makeEthToAtoneTransaction(
        "ethereum",
        "atomone",
        sender,
        ATOMONE_ADDRESS!,
        BigInt(AMOUNT),
        route!.baseToken,
        route!.quoteToken,
        route!.metadata,
      );

      const preparedRequest = (tx as Record<string, unknown>).preparedRequest as RpcTransactionRequest;
      const receiver = preparedRequest.to as `0x${string}`;

      if (route!.baseToken.startsWith("0x")) {
        const tokenAddress = route!.baseToken as `0x${string}`;
        const currentAllowance = await client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [sender, receiver],
        });

        if (currentAllowance < BigInt(AMOUNT)) {
          console.log(`Approving ${AMOUNT} of ${tokenAddress} for ${receiver}...`);
          const approveTx = await client.writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [receiver, BigInt(AMOUNT)],
          });
          const approveReceipt = await client.waitForTransactionReceipt({ hash: approveTx });
          console.log(`Approval confirmed (status: ${approveReceipt.status})`);
          expect(approveReceipt.status).toBe("success");
        }
      }

      console.log("Sending EVM transaction...");
      const txHash = await client.sendTransaction({
        to: receiver,
        value: 0n,
        data: preparedRequest.data,
        chain: mainnet,
      });
      console.log(`Ethereum tx: ${txHash}`);

      const receipt = await client.waitForTransactionReceipt({ hash: txHash });
      console.log(`Tx confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);
      expect(receipt.status).toBe("success");

      console.log(`Packet hash: ${hash}`);
      console.log("Waiting for PACKET_RECV...");

      const recvPacket = await waitForPacketStatus(hash, "PACKET_RECV", ONE_MINUTE * 5);
      expect(recvPacket.source_universal_chain_id).toBe("ethereum.1");
      console.log("PACKET_RECV confirmed!");
      console.log(`  Packet hash: ${recvPacket.packet_hash}`);
      console.log(`  Send tx:     ${recvPacket.packet_send_transaction_hash}`);
      console.log(`  Recv tx:     ${recvPacket.packet_recv_transaction_hash}`);

      console.log("Waiting for PACKET_ACK...");
      const ackPacket = await waitForPacketCompletion(hash, ONE_HOUR);
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
    ONE_HOUR * 2,
  );
});
