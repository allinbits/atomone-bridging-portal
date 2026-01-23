/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSigningAtomoneClient } from "@atomone/atomone-types/atomone/client";
import { EncodeObject, OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { getOfflineSigner } from "@cosmostation/cosmos-client";
import { OfflineAminoSigner } from "@keplr-wallet/types";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, nextTick, Ref, ref } from "vue";

import chainInfo from "@/chain-config.json";

export enum Wallets {
  keplr = "Keplr",
  leap = "Leap",
  cosmostation = "Cosmostation",
  addressOnly = "AddressOnly"
}

export const getWalletHelp = (wallet: Wallets) => {
  switch (wallet) {
    case Wallets.keplr:
      return "https://help.keplr.app/articles/advanced-troubleshooting-guidelines";
    case Wallets.leap:
      return "https://leapwallet.notion.site/Leap-Cosmos-Wallet-Support-ba1da3c05d3341eaa44a1850ed3260ee";
    case Wallets.cosmostation:
      return "https://guide.cosmostation.io/web_wallet_en.html";
  }
};
const useWalletInstance = () => {
  const queryClient = useQueryClient();
  const keplr = computed(() => !!window.keplr);
  const leap = computed(() => !!window.leap);
  const cosmostation = computed(() => !!window.cosmostation);
  const loggedIn = ref(false);
  const address = ref("");
  const used = ref<Wallets | null>(null);


  const signOut = () => {
    address.value = "";
    used.value = null;
    loggedIn.value = false;
  };
  const signer: Ref<OfflineSigner | null> = ref(null);

  const connect = async (walletType: Wallets, toAddress?: string, signal?: AbortSignal) => {
    if (signal?.aborted) {
      return Promise.reject(new DOMException(
        "Aborted",
        "AbortError"
      ));
    }
    const abortHandler = () => {
      address.value = "";
      used.value = null;
      loggedIn.value = false;
    };
    signal?.addEventListener(
      "abort",
      abortHandler
    );
    switch (walletType) {
      case Wallets.keplr:
        try {
          await window.keplr?.experimentalSuggestChain(chainInfo);
          await window.keplr?.enable(chainInfo.chainId);
          if (window.getOfflineSignerOnlyAmino) {
            address.value = (
              await window.getOfflineSignerOnlyAmino(chainInfo.chainId).getAccounts()
            )[0].address;
            loggedIn.value = true;
            used.value = Wallets.keplr;
            signer.value = window.getOfflineSignerOnlyAmino(chainInfo.chainId);
            if (signal?.aborted) {
              abortHandler();
            }
          } else {
            throw new Error("Could not connect to Keplr: getOfflineSigner method does not exist");
          }
        } catch (e) {
          throw new Error("Could not connect to Keplr: " + e);
        } finally {
          signal?.removeEventListener(
            "abort",
            abortHandler
          );
        }
        break;
      case Wallets.leap:
        try {
          await window.leap?.experimentalSuggestChain(chainInfo);
          await window.leap?.enable(chainInfo.chainId);
          address.value = (
            await window.leap.getOfflineSignerOnlyAmino(chainInfo.chainId).getAccounts()
          )[0].address;
          loggedIn.value = true;
          used.value = Wallets.leap;
          signer.value = window.leap.getOfflineSignerOnlyAmino(chainInfo.chainId);
          if (signal?.aborted) {
            abortHandler();
          }
        } catch (e) {
          throw new Error("Could not connect to Leap Wallet: " + e);
        } finally {
          signal?.removeEventListener(
            "abort",
            abortHandler
          );
        }
        break;
      case Wallets.cosmostation:
        try {
          await (window.cosmostation as any).cosmos.request({
            method: "cos_addChain",
            params: {
              chainId: chainInfo.chainId,
              chainName: chainInfo.chainName,
              addressPrefix: chainInfo.bech32Config.bech32PrefixAccAddr,
              baseDenom: chainInfo.stakeCurrency.coinMinimalDenom,
              displayDenom: chainInfo.stakeCurrency.coinDenom,
              restURL: chainInfo.rest,
              decimals: chainInfo.stakeCurrency.coinDecimals, // optional
              coinType: "" + chainInfo.bip44.coinType // optional
            }
          });
        } catch (e: unknown) {
          if ((e as { code: number }).code != -32602) {
            throw e;
          }
        }
        try {
          address.value = (
            await (window.cosmostation as any).cosmos.request({
              method: "cos_requestAccount",
              params: { chainName: chainInfo.chainId }
            })
          ).address;
          loggedIn.value = true;
          used.value = Wallets.cosmostation;
          const cosmostationSigner = (await getOfflineSigner(chainInfo.chainId)) as OfflineSigner;
          if ((cosmostationSigner as OfflineDirectSigner).signDirect) {
            const { signDirect: _signDirect, ...aminoSigner } = cosmostationSigner as OfflineDirectSigner;
            signer.value = aminoSigner as OfflineAminoSigner;
          } else {
            signer.value = cosmostationSigner;
          }
          if (signal?.aborted) {
            abortHandler();
          }
        } catch (e) {
          throw new Error("Could not connect to Cosmostation: " + e);
        } finally {
          signal?.removeEventListener(
            "abort",
            abortHandler
          );
        }
        break;
      case Wallets.addressOnly:
        if (toAddress) {
          address.value = toAddress;
          loggedIn.value = true;
          used.value = Wallets.addressOnly;
        }
        break;
    }
  };
  const sendTx = async (msgs: EncodeObject[]) => {
    if (signer.value) {
      try {
        let client: SigningStargateClient;
        if (msgs[0].typeUrl.startsWith("/atomone.")) {
          client = await getSigningAtomoneClient({ rpcEndpoint: chainInfo.rpc,
            signer: signer.value });
        } else {
          client = await SigningStargateClient.connectWithSigner(
            chainInfo.rpc,
            signer.value
          );
        }
        const simulate = await client.simulate(
          address.value,
          msgs,
          undefined
        );
        console.log(
          "Simulated gas:",
          simulate
        );
        const gasLimit = simulate && simulate > 0
          ? "" + Math.ceil(100000 * 1.3)
          : "500000";
        const result = await client.signAndBroadcast(
          address.value,
          msgs,
          {
            amount: [
              { amount: Math.ceil(Number(gasLimit) * 0.25) + "",
                denom: chainInfo.feeCurrencies[1].coinMinimalDenom }
            ],
            gas: gasLimit
          }
        );
        return result;
      } catch (e) {
        throw new Error("Could not sign messages: " + e);
      }
    } else {
      throw new Error("No Signer available");
    }
  };

  const refreshAddress = async () => {
    console.log("Wallet address changed, refreshing");
    if (used.value) {
      if (used.value == Wallets.addressOnly) {
        await connect(
          used.value,
          address.value
        );
      } else {
        await connect(used.value);
      }
    }
    await nextTick();
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["rewards"] });
    queryClient.invalidateQueries({ queryKey: ["delegations"] });
    queryClient.invalidateQueries({ queryKey: ["validators"] });
  };
  window.addEventListener(
    "cosmostation_keystorechange",
    () => refreshAddress()
  );
  window.addEventListener(
    "keplr_keystorechange",
    () => refreshAddress()
  );
  window.addEventListener(
    "leap_keystorechange",
    () => refreshAddress()
  );

  return { address,
    loggedIn,
    keplr,
    leap,
    cosmostation,
    used,
    signOut,
    connect,
    sendTx };
};

let walletInstance: ReturnType<typeof useWalletInstance>;

export const useWallet = () => {
  if (!walletInstance) {
    walletInstance = useWalletInstance();
  }
  return walletInstance;
};
