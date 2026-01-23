// @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
if (typeof BigInt.prototype.toJSON !== "function") {
  // @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}
import { Call, TokenOrder, Ucs03, Ucs05, Utils, ZkgmInstruction } from "@unionlabs/sdk";
import { ChainRegistry } from "@unionlabs/sdk/ChainRegistry";
import { UniversalChainId } from "@unionlabs/sdk/schema/chain";
import { ChannelId } from "@unionlabs/sdk/schema/channel";
import * as Token from "@unionlabs/sdk/Token";
import { Cosmos } from "@unionlabs/sdk-cosmos";
import * as A from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";

const OSMOSIS_CHAIN_ID = UniversalChainId.make("osmosis.osmosis-1");
const ETHEREUM_CHAIN_ID = UniversalChainId.make("ethereum.1");

const ZKGM_ADDRESS = "osmo1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292qs2uecc";

const SOURCE_CHANNEL_ID = ChannelId.make(2);

export const ATONE_SOLVER_ON_OSMOSIS_METADATA =
  "000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000003f6f736d6f316174306e6539617977683335706d6c7a3065786c35666c336c6a7770657934676336323079797874687173706477396536306d736c666a786d33000000000000000000000000000000000000000000000000000000000000000000" as const;

export const PHOTON_SOLVER_ON_OSMOSIS_METADATA =
  "000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000003f6f736d6f316174306e6539617977683335706d6c7a3065786c35666c336c6a7770657934676336323079797874687173706477396536306d736c666a786d33000000000000000000000000000000000000000000000000000000000000000000" as const;

export const ATONE_SOLVER_ON_ETH_METADATA =
  "0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000014a1a1d0b9182339e86e80db519218ea03ec09a1a10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as const;

export const PHOTON_SOLVER_ON_ETH_METADATA =
  "0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000014222c042e17d94f4c83720583c75a37242921ba1c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as const;

export const ATONE_IBC_DENOM_ON_OSMOSIS = Token.CosmosIbcClassic.make({
  address: "ibc/BC26A7A805ECD6822719472BCB7842A48EF09DF206182F8F259B2593EB5D23FB"
});

export const ATONE_ERC20 = Token.Erc20.make({
  address: "0xA1a1d0B9182339e86e80db519218eA03Ec09a1A1"
});

export const PHOTON_IBC_DENOM_ON_OSMOSIS = Token.CosmosIbcClassic.make({
  address: "ibc/D6E02C5AE8A37FC2E3AB1FC8AC168878ADB870549383DFFEA9FD020C234520A7"
});

export const PHOTON_ERC20 = Token.Erc20.make({
  address: "0x222c042e17d94f4c83720583c75a37242921ba1c"
});
export const makeAtoneIcs20PacketMemo = async ({ sender, receiver, amount }: {
  sender: Ucs05.CosmosDisplay;
  receiver: Ucs05.EvmDisplay;
  amount: bigint;
}) => Effect.gen(function *() {
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
  const ethereumChain = yield* ChainRegistry.byUniversalId(ETHEREUM_CHAIN_ID);

  const refundReceiverOsmosis = Ucs05.CosmosDisplay.make({
    address: Schema.decodeUnknownSync(Ucs05.Bech32FromCanonicalBytesWithPrefix("osmo"))(Ucs05.anyDisplayToCanonical(sender))
  });

  const tokenOrder = yield* TokenOrder.make({
    source: ethereumChain,
    destination: osmosisChain,
    sender: refundReceiverOsmosis,
    receiver: receiver,
    baseToken: ATONE_IBC_DENOM_ON_OSMOSIS,
    baseAmount: amount,
    quoteToken: ATONE_ERC20,
    quoteAmount: amount,
    kind: "solve",
    metadata: ATONE_SOLVER_ON_ETH_METADATA,
    version: 2
  });

  const salt = yield* Utils.generateSalt("cosmos");
  const timeout_timestamp = Utils.getTimeoutInNanoseconds24HoursFromNow();
  const instruction = yield* encodeInstruction(tokenOrder).pipe(Effect.flatMap(Schema.encode(Ucs03.Ucs03WithInstructionFromHex)));

  return {
    wasm: {
      contract: ZKGM_ADDRESS,
      msg: {
        send: {
          channel_id: SOURCE_CHANNEL_ID,
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

export const makePhotonIcs20PacketMemo = async ({ sender, receiver, amount }: {
  sender: Ucs05.CosmosDisplay;
  receiver: Ucs05.EvmDisplay;
  amount: bigint;
}) => Effect.gen(function *() {
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
  const ethereumChain = yield* ChainRegistry.byUniversalId(ETHEREUM_CHAIN_ID);

  const refundReceiverOsmosis = Ucs05.CosmosDisplay.make({
    address: Schema.decodeUnknownSync(Ucs05.Bech32FromCanonicalBytesWithPrefix("osmo"))(Ucs05.anyDisplayToCanonical(sender))
  });

  const tokenOrder = yield* TokenOrder.make({
    source: ethereumChain,
    destination: osmosisChain,
    sender: refundReceiverOsmosis,
    receiver: receiver,
    baseToken: PHOTON_IBC_DENOM_ON_OSMOSIS,
    baseAmount: amount,
    quoteToken: PHOTON_ERC20,
    quoteAmount: amount,
    kind: "solve",
    metadata: PHOTON_SOLVER_ON_ETH_METADATA,
    version: 2
  });

  const salt = yield* Utils.generateSalt("cosmos");
  const timeout_timestamp = Utils.getTimeoutInNanoseconds24HoursFromNow();
  const instruction = yield* encodeInstruction(tokenOrder).pipe(Effect.flatMap(Schema.encode(Ucs03.Ucs03WithInstructionFromHex)));

  return {
    wasm: {
      contract: ZKGM_ADDRESS,
      msg: {
        send: {
          channel_id: SOURCE_CHANNEL_ID,
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
