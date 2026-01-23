/// <reference types="vite/client" />
import type { Keplr, Window as KeplrWindow } from "@keplr-wallet/types";

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<object, object, any>;
  export default component;
}
declare global {
  interface Window extends KeplrWindow {
    leap: Keplr;
    cosmostation: unknown;
  }
}
