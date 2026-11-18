import { createDefaultAminoConverters } from "@cosmjs/stargate";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { bytesToHex } from "viem";
import { describe, expect, it } from "vitest";

import { makeSpectreA1ToEthTransfer } from "@/spectre/a1-eth-hook";
import { SPECTRE_ENCODING } from "@/spectre/constants";
import { createSpectreAminoTypes, createSpectreRegistry, SPECTRE_MSG_TRANSFER_TYPE_URL, spectreMsgTransferCodec } from "@/spectre/msgTransferCodec";

const SAMPLE = {
  sourcePort: "transfer",
  sourceChannel: "spectre-0",
  token: { denom: "uatone",
    amount: "1000000" },
  sender: "atone1abcdefghijklmnopqrstuvwxyz0123456789",
  receiver: "0x1111111111111111111111111111111111111111",
  timeoutTimestamp: 1893456000_000000000n,
  memo: "",
  encoding: SPECTRE_ENCODING
};

const encodingBytes = new TextEncoder().encode(SPECTRE_ENCODING);
const field9Suffix = new Uint8Array([
  0x4a,
  encodingBytes.length,
  ...encodingBytes
]);
// viem's bytesToHex returns 0x-prefixed strings; strip for substring comparisons
const hexOf = (bytes: Uint8Array) => bytesToHex(bytes).replace(
  /^0x/,
  ""
);

describe(
  "spectre MsgTransfer codec",
  () => {
    it(
      "encodes field 9 (encoding) with the correct wire bytes",
      () => {
        const bytes = spectreMsgTransferCodec.encode({ ...SAMPLE,
          timeoutHeight: undefined }).finish();

        // wire format: tag 0x4a (field 9 << 3 | wire type 2), varint length, utf8 payload
        expect(
          hexOf(bytes).endsWith(hexOf(field9Suffix)),
          `expected bytes to end with 4a ${encodingBytes.length.toString(16).padStart(
            2,
            "0"
          )} <encoding payload>`
        ).toBe(true);
      }
    );

    it(
      "writes the encoding field exactly once",
      () => {
        const hex = hexOf(spectreMsgTransferCodec.encode({ ...SAMPLE,
          timeoutHeight: undefined }).finish());
        const marker = hexOf(new Uint8Array([
          0x4a,
          encodingBytes.length
        ]));
        expect(hex.split(marker).length - 1).toBe(1);
      }
    );

    it(
      "round-trips fields 1-8 through cosmjs-types and keeps encoding via the custom decoder",
      () => {
        const encoded = spectreMsgTransferCodec.encode({ ...SAMPLE,
          timeoutHeight: undefined }).finish();

        const viaCosmjsTypes = MsgTransfer.decode(encoded);
        expect(viaCosmjsTypes.sourcePort).toBe(SAMPLE.sourcePort);
        expect(viaCosmjsTypes.sourceChannel).toBe(SAMPLE.sourceChannel);
        expect(viaCosmjsTypes.token).toEqual(SAMPLE.token);
        expect(viaCosmjsTypes.sender).toBe(SAMPLE.sender);
        expect(viaCosmjsTypes.receiver).toBe(SAMPLE.receiver);
        expect(viaCosmjsTypes.timeoutTimestamp).toBe(SAMPLE.timeoutTimestamp);
        expect(viaCosmjsTypes.memo).toBe("");

        const viaCustom = spectreMsgTransferCodec.decode(encoded);
        expect(viaCustom.encoding).toBe(SPECTRE_ENCODING);
        const { timeoutHeight, ...rest } = viaCustom;
        expect(timeoutHeight?.revisionHeight ?? 0n).toBe(0n);
        expect(rest).toEqual({ ...SAMPLE,
          timeoutHeight: undefined });
      }
    );

    it(
      "fromPartial keeps the encoding field",
      () => {
        const message = spectreMsgTransferCodec.fromPartial(SAMPLE);
        expect(message.encoding).toBe(SPECTRE_ENCODING);
        expect(message.sourceChannel).toBe(SAMPLE.sourceChannel);
        expect(message.timeoutTimestamp).toBe(SAMPLE.timeoutTimestamp);
      }
    );

    it(
      "encodes through the spectre registry",
      () => {
        const registry = createSpectreRegistry();
        const bytes = registry.encode({ typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
          value: SAMPLE });
        expect(hexOf(bytes).endsWith(hexOf(field9Suffix))).toBe(true);
        expect(() => registry.decode({ typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
          value: bytes })).not.toThrow();
      }
    );

    it(
      "omits field 9 when encoding is empty",
      () => {
        const bytes = spectreMsgTransferCodec.encode({ ...SAMPLE,
          encoding: "",
          timeoutHeight: undefined }).finish();
        expect(hexOf(bytes).includes(hexOf(new Uint8Array([
          0x4a,
          encodingBytes.length
        ])))).toBe(false);
      }
    );
  }
);

describe(
  "spectre amino converter",
  () => {
    it(
      "toAmino includes encoding and keeps timeout_timestamp as a string",
      () => {
        const amino = createSpectreAminoTypes().toAmino({
          typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
          value: { ...SAMPLE,
            timeoutHeight: undefined }
        });

        expect(amino.type).toBe("cosmos-sdk/MsgTransfer");
        expect(amino.value.encoding).toBe(SPECTRE_ENCODING);
        expect(amino.value.timeout_timestamp).toBe(SAMPLE.timeoutTimestamp.toString());
        expect(amino.value.source_port).toBe(SAMPLE.sourcePort);
        expect(amino.value.source_channel).toBe(SAMPLE.sourceChannel);
        expect(amino.value.token).toEqual(SAMPLE.token);
        expect(amino.value.memo).toBeUndefined();
      }
    );

    it(
      "omits encoding from the amino JSON when empty",
      () => {
        const amino = createSpectreAminoTypes().toAmino({
          typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
          value: { ...SAMPLE,
            encoding: "",
            timeoutHeight: undefined }
        });
        expect(amino.value.encoding).toBeUndefined();
      }
    );

    it(
      "fromAmino round-trips the encoding field",
      () => {
        const encodeObject = createSpectreAminoTypes().fromAmino({
          type: "cosmos-sdk/MsgTransfer",
          value: {
            source_port: SAMPLE.sourcePort,
            source_channel: SAMPLE.sourceChannel,
            token: SAMPLE.token,
            sender: SAMPLE.sender,
            receiver: SAMPLE.receiver,
            timeout_height: {},
            timeout_timestamp: SAMPLE.timeoutTimestamp.toString(),
            memo: "",
            encoding: SPECTRE_ENCODING
          }
        });

        expect(encodeObject.typeUrl).toBe(SPECTRE_MSG_TRANSFER_TYPE_URL);
        expect(encodeObject.value.encoding).toBe(SPECTRE_ENCODING);
        expect(encodeObject.value.timeoutTimestamp).toBe(SAMPLE.timeoutTimestamp);
      }
    );

    it(
      "amino JSON serializes without dropping the encoding key",
      () => {
        const amino = createSpectreAminoTypes().toAmino({
          typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
          value: { ...SAMPLE,
            timeoutHeight: undefined }
        });
        expect(JSON.stringify(amino).includes(`"encoding":"${SPECTRE_ENCODING}"`)).toBe(true);
      }
    );

    it(
      "matches stargate's default amino output for fields 1-8 (only adding encoding)",
      () => {
        const value = { ...SAMPLE,
          timeoutHeight: undefined };
        const spectre = createSpectreAminoTypes().toAmino({ typeUrl: SPECTRE_MSG_TRANSFER_TYPE_URL,
          value });
        const stock = createDefaultAminoConverters()[SPECTRE_MSG_TRANSFER_TYPE_URL].toAmino(value);

        expect({ ...spectre.value,
          encoding: undefined }).toEqual({ ...stock,
          encoding: undefined });
      }
    );
  }
);

describe(
  "makeSpectreA1ToEthTransfer",
  () => {
    it(
      "builds a full MsgTransfer EncodeObject with the ABI encoding marker",
      () => {
        const before = Date.now();
        const encodeObject = makeSpectreA1ToEthTransfer({
          sender: SAMPLE.sender,
          receiver: SAMPLE.receiver,
          denom: "uatone",
          amount: 1000000n
        });
        const after = Date.now();

        expect(encodeObject.typeUrl).toBe(SPECTRE_MSG_TRANSFER_TYPE_URL);
        const value = encodeObject.value as { encoding: string } & MsgTransfer;
        expect(value.sourcePort).toBe("transfer");
        expect(value.sourceChannel).toBe("spectre-0");
        expect(value.token.denom).toBe("uatone");
        expect(value.token.amount).toBe("1000000");
        expect(value.sender).toBe(SAMPLE.sender);
        expect(value.receiver).toBe(SAMPLE.receiver);
        expect(value.memo).toBe("");
        expect(value.encoding).toBe(SPECTRE_ENCODING);
        // timeout height is unset: either absent or a zero Height (which encodes to no bytes)
        expect(value.timeoutHeight?.revisionHeight ?? 0n).toBe(0n);
        expect(value.timeoutHeight?.revisionNumber ?? 0n).toBe(0n);

        /*
         * IBC v2 reads the timeout as Unix seconds (time.Unix(ts, 0)), capped at
         * block time + 24h; the hook must therefore emit seconds, not nanoseconds.
         */
        const minTimeout = BigInt(Math.floor(before / 1000) + 3600);
        const maxTimeout = BigInt(Math.floor(after / 1000) + 3600);
        expect(value.timeoutTimestamp).toBeGreaterThanOrEqual(minTimeout);
        expect(value.timeoutTimestamp).toBeLessThanOrEqual(maxTimeout);
      }
    );

    it(
      "is encodable through the spectre registry (field 9 present)",
      () => {
        const encodeObject = makeSpectreA1ToEthTransfer({
          sender: SAMPLE.sender,
          receiver: SAMPLE.receiver,
          denom: "uatone",
          amount: 1n
        });
        const bytes = createSpectreRegistry().encode(encodeObject);
        expect(hexOf(bytes).endsWith(hexOf(field9Suffix))).toBe(true);
      }
    );
  }
);
