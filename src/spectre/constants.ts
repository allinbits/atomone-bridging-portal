import { NETWORKS } from "@/networks";

// Protocol-level constants shared by every network.
export const SPECTRE_ENCODING = "application/x-solidity-abi";
export const SPECTRE_TRANSFER_PORT = "transfer";

// Fee/gas defaults (devnet-verified).
export const SPECTRE_DEFAULT_GAS = 300_000;
export const SPECTRE_GAS_MULTIPLIER = 1.3;
export const SPECTRE_MIN_FEE_AMOUNT = 100_000;

// Devnet deployment re-exports: default hook parameters and e2e test values.
const DEVNET = NETWORKS.devnet;

const EVM_CHAIN_IDS = { sepolia: 11155111,
  ethereum: 1 } as const;

export const SPECTRE_COSMOS_CHAIN_ID = DEVNET.cosmos.chainId;
export const SPECTRE_COSMOS_RPC = DEVNET.cosmos.rpc;
export const SPECTRE_COSMOS_FEE_DENOM = DEVNET.cosmos.feeDenom;
export const SPECTRE_COSMOS_CLIENT_ID = DEVNET.cosmos.spectreClientId;
export const SPECTRE_EVM_CHAIN = DEVNET.evm.chain;
export const SPECTRE_EVM_CHAIN_ID = EVM_CHAIN_IDS[DEVNET.evm.chain];
export const SPECTRE_EVM_CLIENT_ID = DEVNET.evm.clientId;
export const SPECTRE_ICS20_ADDRESS = DEVNET.evm.ics20;
export const SPECTRE_ICS26_ROUTER_ADDRESS = DEVNET.evm.ics26;
export const SPECTRE_ERC20_ADDRESS = DEVNET.evm.erc20;
export const SPECTRE_WRAPPED_UATONE_ADDRESS = (DEVNET.routes.find((route) => route.src === "AtomOne")?.quoteToken ?? DEVNET.evm.erc20) as `0x${string}`;
