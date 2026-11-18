import { computed, type ComputedRef, type Ref, ref } from "vue";

import { DEFAULT_NETWORK, type NetworkConfig, type NetworkName, NETWORKS } from "@/networks";

const STORAGE_KEY = "atomone-bridge-network";

const isNetworkName = (value: unknown): value is NetworkName => typeof value === "string" && Object.prototype.hasOwnProperty.call(
  NETWORKS,
  value
);

type NetworkChangeListener = (network: NetworkName) => void;

/*
 * Module-singleton composable (matches useWallet/useEthWallet).
 *
 * Stays dependency-free: wallet composables register sign-out/invalidation
 * listeners via onNetworkChange so setNetwork does not need to import them
 * (which would create a cycle, since useWallet reads the network for chain info).
 */
const useNetworkInstance = () => {
  const stored = typeof localStorage === "undefined"
    ? null
    : localStorage.getItem(STORAGE_KEY);
  const network: Ref<NetworkName> = ref(isNetworkName(stored)
    ? stored
    : DEFAULT_NETWORK);
  const networkConfig: ComputedRef<NetworkConfig> = computed(() => NETWORKS[network.value]);

  const listeners: NetworkChangeListener[] = [];

  /** Registered by the wallet composables; run on every successful switch. */
  const onNetworkChange = (listener: NetworkChangeListener) => {
    listeners.push(listener);
  };

  const setNetwork = (name: NetworkName) => {
    if (!isNetworkName(name) || name === network.value) {
      return;
    }
    network.value = name;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        STORAGE_KEY,
        name
      );
    }
    for (const listener of listeners) {
      listener(name);
    }
  };

  return { network,
    networkConfig,
    setNetwork,
    onNetworkChange };
};

let networkInstance: ReturnType<typeof useNetworkInstance>;

export const useNetwork = () => {
  if (!networkInstance) {
    networkInstance = useNetworkInstance();
  }
  return networkInstance;
};
