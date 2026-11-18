import type { GeneratedType } from "@cosmjs/proto-signing";
import { OfflineSigner, Registry } from "@cosmjs/proto-signing";
import { type AminoConverters, AminoTypes, createDefaultAminoConverters, defaultRegistryTypes, SigningStargateClient } from "@cosmjs/stargate";
import { BinaryReader, BinaryWriter } from "cosmjs-types/binary";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { Height } from "cosmjs-types/ibc/core/client/v1/client";

export const SPECTRE_MSG_TRANSFER_TYPE_URL = "/ibc.applications.transfer.v1.MsgTransfer";
export const SPECTRE_MSG_TRANSFER_AMINO_TYPE = "cosmos-sdk/MsgTransfer";

export type SpectreMsgTransfer = MsgTransfer & { encoding: string };

// cosmjs-types declares timeoutHeight as required; spectre transfers never set it.
type SpectreMsgTransferInput = Omit<SpectreMsgTransfer, "timeoutHeight" | "encoding"> & {
  timeoutHeight?: Height | undefined;
  encoding: string;
};

const FIELD_9_ENCODING_TAG = 9 << 3 | 2; // 0x4a

/**
 * Local copy of @cosmjs/amino's omitDefault (not a direct dependency of this project).
 * Returns undefined for zero values so JSON.stringify drops the key entirely.
 */
const omitDefault = <T extends string | number | bigint | boolean | undefined>(input: T): T | undefined => {
  if (typeof input === "string") return input === ""
    ? undefined
    : input;
  if (typeof input === "number") return input === 0
    ? undefined
    : input;
  if (typeof input === "bigint") return input === 0n
    ? undefined
    : input;
  if (typeof input === "boolean") return input === false
    ? undefined
    : input;
  return input;
};

/**
 * Scans raw MsgTransfer wire bytes for field 9 (encoding, wire type 2) and
 * returns the last value found. Used as a fallback for cosmjs-types versions
 * whose decoder does not know field 9.
 */
const readField9 = (input: Uint8Array | BinaryReader): string => {
  const reader = input instanceof BinaryReader
    ? input
    : new BinaryReader(input);
  let encoding = "";
  while (reader.pos < reader.len) {
    const tag = reader.uint32();
    if (tag >>> 3 === 9 && (tag & 7) === 2) {
      encoding = reader.string();
    } else {
      reader.skipType(tag & 7);
    }
  }
  return encoding;
};

/**
 * Codec for ibc-go v10's MsgTransfer that always emits proto field 9
 * (`encoding`, e.g. "application/x-solidity-abi") exactly once, even when the
 * installed cosmjs-types drops the field. Fields 1-8 are delegated to
 * cosmjs-types with `encoding` cleared, then field 9 is appended manually.
 */
export const spectreMsgTransferCodec = {
  typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
  encode (message: SpectreMsgTransferInput, writer?: BinaryWriter): BinaryWriter {
    const target = MsgTransfer.encode(
      { ...message,
        encoding: "" } as MsgTransfer,
      writer
    );
    if (message.encoding !== "") {
      target.uint32(FIELD_9_ENCODING_TAG).string(message.encoding);
    }
    return target;
  },
  decode (input: Uint8Array | BinaryReader, length?: number): SpectreMsgTransfer {
    const message = MsgTransfer.decode(
      input,
      length
    );
    if (!message.encoding) {
      message.encoding = readField9(input);
    }
    return message;
  },
  fromPartial (value: Partial<SpectreMsgTransferInput>): SpectreMsgTransfer {
    const { encoding, ...rest } = value;
    const message = MsgTransfer.fromPartial(rest as Partial<MsgTransfer>);
    message.encoding = encoding ?? "";
    return message;
  }
} satisfies GeneratedType & { typeUrl: string };

/**
 * Amino converter mirroring @cosmjs/stargate's MsgTransfer entry, plus the
 * `encoding` field. The chain's LegacyMsg reconstructs the amino JSON from the
 * proto (including the encoding string), so the amino sign doc must carry it
 * too or signature verification fails on-chain. The key is only present when
 * non-empty, matching the chain's omitempty behaviour.
 */
export const spectreMsgTransferAminoConverter = {
  aminoType: SPECTRE_MSG_TRANSFER_AMINO_TYPE,
  toAmino: ({
    sourcePort,
    sourceChannel,
    token,
    sender,
    receiver,
    timeoutHeight,
    timeoutTimestamp,
    memo,
    encoding
  }: SpectreMsgTransfer) => ({
    source_port: sourcePort,
    source_channel: sourceChannel,
    token: token,
    sender: sender,
    receiver: receiver,
    timeout_height: timeoutHeight
      ? {
        revision_height: omitDefault(timeoutHeight.revisionHeight)?.toString(),
        revision_number: omitDefault(timeoutHeight.revisionNumber)?.toString()
      }
      : {},
    timeout_timestamp: omitDefault(timeoutTimestamp)?.toString(),
    memo: omitDefault(memo),
    encoding: omitDefault(encoding)
  }),
  fromAmino: ({
    source_port,
    source_channel,
    token,
    sender,
    receiver,
    timeout_height,
    timeout_timestamp,
    memo,
    encoding
  }: {
    source_port: string;
    source_channel: string;
    token: { denom: string;
      amount: string; };
    sender: string;
    receiver: string;
    timeout_height?: { revision_height?: string;
      revision_number?: string; };
    timeout_timestamp?: string;
    memo?: string;
    encoding?: string;
  }) => spectreMsgTransferCodec.fromPartial({
    sourcePort: source_port,
    sourceChannel: source_channel,
    token,
    sender,
    receiver,
    timeoutHeight: timeout_height
      ? {
        revisionHeight: BigInt(timeout_height.revision_height || "0"),
        revisionNumber: BigInt(timeout_height.revision_number || "0")
      }
      : undefined,
    timeoutTimestamp: BigInt(timeout_timestamp || "0"),
    memo: memo ?? "",
    encoding: encoding ?? ""
  })
};

export const createSpectreRegistry = (): Registry => new Registry([
  ...defaultRegistryTypes,
  [
    SPECTRE_MSG_TRANSFER_TYPE_URL,
    spectreMsgTransferCodec
  ]
]);

export const createSpectreAminoTypes = (): AminoTypes => new AminoTypes({
  ...createDefaultAminoConverters(),
  [SPECTRE_MSG_TRANSFER_TYPE_URL]: spectreMsgTransferAminoConverter
} satisfies AminoConverters);

/**
 * SigningStargateClient wired with the spectre codec and amino converter so
 * that MsgTransfer keeps its `encoding` field in both sign modes.
 */
export const createSpectreSigningClient = (rpcUrl: string, signer: OfflineSigner): Promise<SigningStargateClient> => SigningStargateClient.connectWithSigner(
  rpcUrl,
  signer,
  {
    registry: createSpectreRegistry(),
    aminoTypes: createSpectreAminoTypes()
  }
);
