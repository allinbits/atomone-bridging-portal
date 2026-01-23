import { MsgMintPhoton } from "@atomone/atomone-types/atomone/photon/v1/tx";
import { EncodeObject } from "@cosmjs/proto-signing";

import chainInfo from "@/chain-config.json";
import { useWallet } from "@/composables/useWallet";
import CommandBuilder from "@/utility/commandBuilder.ts";


export const usePhoton = () => {
  const createMint = async (mint: Partial<MsgMintPhoton>, cli: boolean = false) => {
    const { sendTx, address } = useWallet();
    const fetchSequence = async () => {
      const res = await fetch(`${chainInfo.rest}cosmos/auth/v1beta1/accounts/${address.value}`).then((response) => response.json());
      return parseInt(res.account.sequence);
    };
    if (cli && mint.amount && mint.toAddress) {
      const command = CommandBuilder.Mint().
        withChainId(chainInfo.chainId).
        withFees([
          { amount: "5000",
            denom: chainInfo.feeCurrencies[0].coinMinimalDenom }
        ]).
        withSequence(await fetchSequence()).
        withSigner(address.value).
        addAmountParam(mint.amount).
        finish();
      return command;
    } else {
      const Mint: EncodeObject = {
        typeUrl: "/atomone.photon.v1.MsgMintPhoton",
        value: {
          toAddress: address.value,
          amount: mint.amount
        }
      };
      const result = await sendTx([Mint]);
      return result;
    }
  };
  return { createMint };
};
