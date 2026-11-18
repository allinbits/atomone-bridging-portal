import chainConfig from "@/chain-config.json";

export type NetworkName = "devnet" | "testnet" | "mainnet";

export const NETWORK_NAMES: NetworkName[] = [
  "devnet",
  "testnet",
  "mainnet"
];

export interface SpectreRoute {
  src: string;
  dest: string;
  denom: string;
  evmChain: "sepolia" | "ethereum";
  baseToken: string;
  quoteToken: string;
  sourceChannel: string;
  destChannel: string;
}

export interface NetworkConfig {
  name: NetworkName;
  label: string;

  /** false => selectable but shows the "no routes" empty state */
  available: boolean;
  cosmos: { chainId: string;
    chainName: string;
    rpc: string;
    rest: string;
    feeDenom: string;
    spectreClientId: string; };
  evm: { chain: "sepolia" | "ethereum";
    ics20: `0x${string}`;
    ics26: `0x${string}`;
    erc20: `0x${string}`;
    clientId: string; };
  routes: SpectreRoute[];
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

const env = import.meta.env;

// Devnet deployment (env-overridable so one build can target another spectre deployment).
const DEVNET_COSMOS_RPC = env.VITE_SPECTRE_COSMOS_RPC ?? "https://atomone-devnet-1-rpc.allinbits.services";
const DEVNET_COSMOS_CHAIN_ID = env.VITE_SPECTRE_COSMOS_CHAIN_ID ?? "atomone-devnet-1";
const DEVNET_COSMOS_CLIENT_ID = env.VITE_SPECTRE_COSMOS_CLIENT_ID ?? "spectre-0";
const DEVNET_EVM_CLIENT_ID = env.VITE_SPECTRE_EVM_CLIENT_ID ?? "atomone-1";
const DEVNET_ICS20 = (env.VITE_SPECTRE_ICS20_ADDRESS ?? "0xf933092b9632ae8b9d9a4984288a52a557848fbf") as `0x${string}`;
const DEVNET_ICS26 = (env.VITE_SPECTRE_ICS26_ROUTER_ADDRESS ?? "0x5a106d6892495b026774843751271d5e3b528554") as `0x${string}`;
const DEVNET_ERC20 = (env.VITE_SPECTRE_ERC20_ADDRESS ?? "0x7d4874e2b462e47750663e9b3b7f8840ec3c376c") as `0x${string}`;
const DEVNET_WRAPPED_UATONE = (env.VITE_SPECTRE_WRAPPED_UATONE_ADDRESS ?? "0x0cBa733eC8473942d8cc94948eB875Dd7976eE3d") as `0x${string}`;

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  devnet: {
    name: "devnet",
    label: "Devnet",
    available: true,
    cosmos: {
      chainId: DEVNET_COSMOS_CHAIN_ID,
      chainName: "AtomOne Devnet",
      rpc: DEVNET_COSMOS_RPC,
      // TODO: point at the devnet LCD once it is public; wallets use rest for display queries only
      rest: DEVNET_COSMOS_RPC,
      feeDenom: env.VITE_SPECTRE_COSMOS_FEE_DENOM ?? "uphoton",
      spectreClientId: DEVNET_COSMOS_CLIENT_ID
    },
    evm: {
      chain: "sepolia",
      ics20: DEVNET_ICS20,
      ics26: DEVNET_ICS26,
      erc20: DEVNET_ERC20,
      clientId: DEVNET_EVM_CLIENT_ID
    },
    routes: [
      {
        src: "AtomOne",
        dest: "Sepolia",
        denom: "uatone",
        evmChain: "sepolia",
        baseToken: "uatone",
        quoteToken: DEVNET_WRAPPED_UATONE,
        sourceChannel: DEVNET_COSMOS_CLIENT_ID,
        destChannel: DEVNET_EVM_CLIENT_ID
      },
      {
        src: "Sepolia",
        dest: "AtomOne",
        denom: "uatone",
        evmChain: "sepolia",
        baseToken: DEVNET_ERC20,
        quoteToken: "",
        sourceChannel: DEVNET_EVM_CLIENT_ID,
        destChannel: DEVNET_COSMOS_CLIENT_ID
      }
    ]
  },
  testnet: {
    name: "testnet",
    label: "Testnet",
    available: false,
    cosmos: {
      // TODO: replace with the real testnet deployment
      chainId: "atomone-testnet-1",
      chainName: "AtomOne Testnet",
      rpc: "https://atomone-testnet-1-rpc.allinbits.services",
      rest: "https://atomone-testnet-1-rpc.allinbits.services",
      feeDenom: "uphoton",
      spectreClientId: ""
    },
    evm: { chain: "sepolia",
      ics20: ZERO_ADDRESS,
      ics26: ZERO_ADDRESS,
      erc20: ZERO_ADDRESS,
      clientId: "" },
    routes: []
  },
  mainnet: {
    name: "mainnet",
    label: "Mainnet",
    available: false,
    cosmos: {
      chainId: chainConfig.chainId,
      chainName: chainConfig.chainName,
      rpc: chainConfig.rpc,
      rest: chainConfig.rest,
      feeDenom: "uphoton",
      spectreClientId: ""
    },
    evm: { chain: "ethereum",
      ics20: ZERO_ADDRESS,
      ics26: ZERO_ADDRESS,
      erc20: ZERO_ADDRESS,
      clientId: "" },
    routes: []
  }
};

export const DEFAULT_NETWORK: NetworkName = "devnet";
