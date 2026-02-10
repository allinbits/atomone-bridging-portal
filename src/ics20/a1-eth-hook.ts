// @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
if (typeof BigInt.prototype.toJSON !== "function") {
  // @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}
import { Call, TokenOrder, Ucs03, Ucs05, Utils, ZkgmInstruction } from "@unionlabs/sdk";
import { ChainRegistry } from "@unionlabs/sdk/ChainRegistry";
import { Cosmos } from "@unionlabs/sdk-cosmos";
import * as A from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";

import { BASE_CHAIN_ID, BASE_ZKGM_ADDRESS, BASEOSMO_SOURCE_CHANNEL_ID, cosmosUcs, ETH_ZKGM_ADDRESS, ETHEREUM_CHAIN_ID, etherUcs, ETHOSMO_SOURCE_CHANNEL_ID, OSMOSIS_CHAIN_ID } from "./constants.ts";


export const makeAtoneToEthTransaction = async (src: string, dest: string, sender: string, rcpt: string, amount: bigint, baseToken: string, quoteToken: string, solver_metadata: string) => {
  return Effect.gen(function *() {
    const encodeInstruction: (
      u: ZkgmInstruction.ZkgmInstruction
    ) => Effect.Effect<
      Ucs03.Ucs03,
        ParseResult.ParseError | Cause.TimeoutException | Cosmos.QueryContractError
    > = pipe(
      Match.type<ZkgmInstruction.ZkgmInstruction>(),
      Match.tagsExhaustive({
        Batch: (batch) => pipe(
          batch.instructions,
          A.map(encodeInstruction),
          Effect.allWith({ concurrency: "unbounded" }),
          Effect.map((operand) => new Ucs03.Batch({
            opcode: batch.opcode,
            version: batch.version,
            operand
          }))
        ),
        TokenOrder: TokenOrder.encodeV2,
        Call: Call.encode
      })
    );

    const osmosisChain = yield* ChainRegistry.byUniversalId(OSMOSIS_CHAIN_ID);
    const targetChain = src === "ethereum"
      ? yield* ChainRegistry.byUniversalId(ETHEREUM_CHAIN_ID)
      : yield* ChainRegistry.byUniversalId(BASE_CHAIN_ID);

    const refundReceiverOsmosis = Ucs05.CosmosDisplay.make({
      address: Schema.decodeUnknownSync(Ucs05.Bech32FromCanonicalBytesWithPrefix("osmo"))(Ucs05.anyDisplayToCanonical(cosmosUcs(sender)))
    });

    const tokenOrder = yield* TokenOrder.make({
      source: targetChain,
      destination: osmosisChain,
      sender: refundReceiverOsmosis,
      receiver: etherUcs(rcpt),
      baseToken: baseToken,
      baseAmount: amount,
      quoteToken: quoteToken,
      quoteAmount: amount,
      kind: "solve",
      metadata: solver_metadata as `0x${string}`,
      version: 2
    });

    const salt = yield* Utils.generateSalt("cosmos");
    const timeout_timestamp = Utils.getTimeoutInNanoseconds24HoursFromNow();
    const instruction = yield* encodeInstruction(tokenOrder).pipe(Effect.flatMap(Schema.encode(Ucs03.Ucs03WithInstructionFromHex)));

    return {
      wasm: {
        contract: dest === "ethereum"
          ? ETH_ZKGM_ADDRESS
          : BASE_ZKGM_ADDRESS,
        msg: {
          send: {
            channel_id: dest === "ethereum"
              ? ETHOSMO_SOURCE_CHANNEL_ID
              : BASEOSMO_SOURCE_CHANNEL_ID,
            timeout_height: "0",
            timeout_timestamp,
            salt,
            instruction
          }
        }
      }
    };
  }).pipe(
    Effect.provide(ChainRegistry.Default),
    Effect.runPromise
  );
};
