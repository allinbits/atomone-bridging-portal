// @vitest-environment node
import "dotenv/config";

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { StargateClient } from "@cosmjs/stargate";
import { createWalletClient, erc20Abi, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import { SPECTRE_COSMOS_RPC, SPECTRE_ERC20_ADDRESS, SPECTRE_ICS20_ADDRESS } from "@/spectre/constants";
import { makeSpectreEthToA1Transfer } from "@/spectre/eth-a1-hook";

import { withFileLock } from "./_file-lock";

const EVM_PRIVATE_KEY = process.env.TEST_EVM_PRIVATE_KEY;
const MNEMONIC = process.env.TEST_MNEMONIC;
const ATOMONE_RPC = process.env.ATOMONE_RPC || SPECTRE_COSMOS_RPC;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || process.env.VITE_TEST_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
const AMOUNT = process.env.TEST_AMOUNT || "1000000";
const TEST_ENABLE_WAIT_FOR_ACK = process.env.TEST_ENABLE_WAIT_FOR_ACK === "true";

const ONE_MINUTE = 1 * 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
// IBC v2 relay to the devnet plus finality; keep a generous budget.
const ACK_TIMEOUT_MS = 25 * ONE_MINUTE;
const ACK_POLL_INTERVAL_MS = 10_000;

const hasEnv = Boolean(EVM_PRIVATE_KEY && (process.env.TEST_COSMOS_ADDRESS || MNEMONIC));

const ibcBalances = async (rpc: string, address: string) => {
  const client = await StargateClient.connect(rpc);
  const balances = await client.getAllBalances(address);
  return new Map(balances.filter((b) => b.denom.startsWith("ibc/")).map((b) => [
    b.denom,
    b.amount
  ]));
};

const totalIbcBalance = (balances: Map<string, string>) => [...balances.values()].reduce(
  (sum, amount) => sum + BigInt(amount),
  0n
);

describe(
  "Sepolia → AtomOne (spectre) Bridge E2E",
  () => {
    it.skipIf(!hasEnv)(
      "bridges tokens from Sepolia to AtomOne via the spectre IBC v2 path",
      async () => {
        let cosmosReceiver = process.env.TEST_COSMOS_ADDRESS;
        if (!cosmosReceiver && MNEMONIC) {
          const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            MNEMONIC,
            { prefix: "atone" }
          );
          [cosmosReceiver] = (await wallet.getAccounts()).map((a) => a.address);
        }
        console.log(`Recipient (AtomOne): ${cosmosReceiver}`);
        console.log(`ICS20: ${SPECTRE_ICS20_ADDRESS}, ERC20: ${SPECTRE_ERC20_ADDRESS}, RPC: ${SEPOLIA_RPC}`);

        const account = privateKeyToAccount(EVM_PRIVATE_KEY as `0x${string}`);
        const sender = account.address;
        console.log(`Sender (EVM): ${sender}`);

        const client = createWalletClient({
          account,
          chain: sepolia,
          transport: http(SEPOLIA_RPC)
        }).extend(publicActions);

        const ethBalance = await client.getBalance({ address: sender });
        console.log(`ETH Balance: ${ethBalance}`);
        expect(
          ethBalance,
          "Insufficient ETH balance for gas"
        ).toBeGreaterThan(0n);

        const tokenBalance = await client.readContract({
          address: SPECTRE_ERC20_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [sender]
        });
        console.log(`ERC20 balance: ${tokenBalance}`);
        expect(
          tokenBalance,
          `Insufficient ERC20 balance: need ${AMOUNT}, have ${tokenBalance}`
        ).toBeGreaterThanOrEqual(BigInt(AMOUNT));

        const balancesBefore = await ibcBalances(
          ATOMONE_RPC,
          cosmosReceiver!
        );
        console.log(`ibc/ balances before: ${[...balancesBefore.entries()].map(([
          denom,
          amount
        ]) => `${amount} ${denom}`).join(", ") || "(none)"}`);

        const { to, data, approveSpender } = makeSpectreEthToA1Transfer({
          baseToken: SPECTRE_ERC20_ADDRESS,
          amount: BigInt(AMOUNT),
          receiver: cosmosReceiver!
        });

        const txHash = await withFileLock(
          "spectre-sepolia-nonce",
          async () => {
            const currentAllowance = await client.readContract({
              address: SPECTRE_ERC20_ADDRESS,
              abi: erc20Abi,
              functionName: "allowance",
              args: [
                sender,
                approveSpender
              ]
            });

            if (currentAllowance < BigInt(AMOUNT)) {
              console.log(`Approving ${AMOUNT} of ${SPECTRE_ERC20_ADDRESS} for ${approveSpender}...`);
              const approveTx = await client.writeContract({
                address: SPECTRE_ERC20_ADDRESS,
                abi: erc20Abi,
                functionName: "approve",
                args: [
                  approveSpender,
                  BigInt(AMOUNT)
                ]
              });
              const approveReceipt = await client.waitForTransactionReceipt({ hash: approveTx });
              console.log(`Approval confirmed (status: ${approveReceipt.status})`);
              expect(approveReceipt.status).toBe("success");
            } else {
              console.log(`Allowance already sufficient: ${currentAllowance}`);
            }

            const nonce = await client.getTransactionCount({
              address: sender,
              blockTag: "pending"
            });

            console.log("Sending sendTransfer transaction...");
            const hash = await client.sendTransaction({
              to,
              value: 0n,
              data,
              chain: sepolia,
              nonce
            });
            return hash;
          }
        );

        console.log(`Sepolia tx: ${txHash}`);
        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        console.log(`Tx confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);
        expect(receipt.status).toBe("success");

        if (TEST_ENABLE_WAIT_FOR_ACK) {
          console.log(`Waiting up to ${ACK_TIMEOUT_MS / ONE_MINUTE} minutes for the ibc/ voucher balance on AtomOne...`);
          const startedAt = Date.now();
          let balancesAfter = balancesBefore;
          while (Date.now() - startedAt < ACK_TIMEOUT_MS) {
            balancesAfter = await ibcBalances(
              ATOMONE_RPC,
              cosmosReceiver!
            );
            if (totalIbcBalance(balancesAfter) > totalIbcBalance(balancesBefore)) {
              break;
            }
            await new Promise((resolve) => setTimeout(
              resolve,
              ACK_POLL_INTERVAL_MS
            ));
          }
          console.log(`ibc/ balances after: ${[...balancesAfter.entries()].map(([
            denom,
            amount
          ]) => `${amount} ${denom}`).join(", ") || "(none)"}`);
          expect(
            totalIbcBalance(balancesAfter),
            `ibc/ voucher balance did not increase within ${ACK_TIMEOUT_MS / ONE_MINUTE} minutes`
          ).toBeGreaterThan(totalIbcBalance(balancesBefore));
          console.log("Spectre bridge completed successfully!");
        } else {
          console.log("Skipping balance wait (TEST_ENABLE_WAIT_FOR_ACK=false)");
        }
      },
      ONE_HOUR
    );
  }
);
