import { describe, expect, it } from "vitest";

import { NETWORKS } from "@/networks";

const routes = NETWORKS.devnet.routes;

describe(
  "devnet spectre routes",
  () => {
    it(
      "adds AtomOne <-> Sepolia spectre routes for uatone",
      () => {
        const a1ToSepolia = routes.find((r) => r.src === "AtomOne" && r.dest === "Sepolia" && r.denom === "uatone");
        expect(a1ToSepolia?.evmChain).toBe("sepolia");
        expect(a1ToSepolia?.sourceChannel).toBe(NETWORKS.devnet.cosmos.spectreClientId);

        const sepoliaToA1 = routes.find((r) => r.src === "Sepolia" && r.dest === "AtomOne" && r.denom === "uatone");
        expect(sepoliaToA1?.baseToken).toMatch(/^0x[0-9a-fA-F]{40}$/);
      }
    );

    it(
      "only spectre routes remain",
      () => {
        expect(routes.length).toBe(2);
        for (const route of routes) {
          expect(route.evmChain).toBe("sepolia");
        }
      }
    );
  }
);
