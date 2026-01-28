/// <reference types="vite/client" />
import type { Keplr, Window as KeplrWindow } from "@keplr-wallet/types";

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<object, object, any>;
  export default component;
}

// EIP-1193 Provider interface for Ethereum wallets
interface EIP1193Provider {
  request: (args: { method: string;
    params?: unknown[]; }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
}

// Extended Keplr interface with Ethereum provider support
interface KeplrWithEthereum extends Keplr {
  ethereum?: EIP1193Provider;
}

declare global {
  interface Window extends KeplrWindow {
    keplr?: KeplrWithEthereum;
    leap: Keplr & { ethereum?: EIP1193Provider };
    cosmostation: unknown;
    ethereum?: EIP1193Provider;
  }
}
