import { describe, expect, it } from "vitest";

import { DEFAULT_NETWORK, NETWORK_NAMES, NETWORKS } from "@/networks";

describe(
  "networks",
  () => {
    it(
      "defines devnet, testnet and mainnet",
      () => {
        expect(NETWORK_NAMES).toEqual([
          "devnet",
          "testnet",
          "mainnet"
        ]);
        expect(NETWORKS.devnet.label).toBe("Devnet");
        expect(NETWORKS.testnet.label).toBe("Testnet");
        expect(NETWORKS.mainnet.label).toBe("Mainnet");
        expect(DEFAULT_NETWORK).toBe("devnet");
      }
    );

    it(
      "devnet is the only available network and carries both spectre routes",
      () => {
        expect(NETWORKS.devnet.available).toBe(true);
        expect(NETWORKS.testnet.available).toBe(false);
        expect(NETWORKS.mainnet.available).toBe(false);

        const routes = NETWORKS.devnet.routes;
        expect(routes.length).toBe(2);
        for (const route of routes) {
          expect(route.evmChain).toBe("sepolia");
        }
        expect(NETWORKS.testnet.routes).toEqual([]);
        expect(NETWORKS.mainnet.routes).toEqual([]);
      }
    );

    it(
      "devnet deployment values are well-formed",
      () => {
        const { cosmos, evm } = NETWORKS.devnet;
        expect(cosmos.chainId).toBe("atomone-devnet-1");
        expect(cosmos.spectreClientId).toBe("spectre-0");
        expect(cosmos.feeDenom).toBe("uphoton");
        expect(evm.chain).toBe("sepolia");
        expect(evm.clientId).toBe("atomone-1");
        expect(evm.ics20).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(evm.ics26).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(evm.erc20).toMatch(/^0x[0-9a-fA-F]{40}$/);
      }
    );

    it(
      "keeps route lookup by src/dest/denom unambiguous",
      () => {
        for (const config of Object.values(NETWORKS)) {
          const keys = config.routes.map((r) => `${r.src.toLowerCase()}|${r.dest.toLowerCase()}|${r.denom}`);
          expect(
            new Set(keys).size,
            config.name
          ).toBe(keys.length);
        }
      }
    );
  }
);
