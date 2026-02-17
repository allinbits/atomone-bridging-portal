/* eslint-disable max-lines-per-function */
import { useQueryClient } from "@tanstack/vue-query";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  type WalletClient
} from "viem";
import { base, mainnet } from "viem/chains";
import { computed, nextTick, Ref, ref } from "vue";

import routes from "@/routes.json";

// ERC20 token addresses on Ethereum (from routes.json)
const getTokenAddress = (denom: string): `0x${string}` | null => {
  const route = routes.find((r) => r.src === "AtomOne" && r.dest === "Ethereum" && r.denom === denom);
  return route?.quoteToken as `0x${string}` | null;
};

export const ERC20_TOKENS = {
  ATONE: {
    address: getTokenAddress("uatone"),
    symbol: "ATONE",
    decimals: 6
  },
  PHOTON: {
    address: getTokenAddress("uphoton"),
    symbol: "PHOTON",
    decimals: 6
  }
} as const;

export enum EthWallets {
  metamask = "MetaMask",
  coinbase = "Coinbase Wallet",
  rabby = "Rabby",
  keplr = "Keplr",
  leap = "Leap",
  generic = "Browser Wallet"
}

export const getEthWalletHelp = (wallet: EthWallets) => {
  switch (wallet) {
    case EthWallets.metamask:
      return "https://support.metamask.io/";
    case EthWallets.coinbase:
      return "https://help.coinbase.com/en/wallet";
    case EthWallets.rabby:
      return "https://rabby.io/";
    case EthWallets.keplr:
      return "https://help.keplr.app/";
    case EthWallets.leap:
      return "https://leapwallet.notion.site/";
    case EthWallets.generic:
      return "https://ethereum.org/en/wallets/";
  }
};

export type SupportedChain = "ethereum" | "base";

const chainConfig = {
  ethereum: mainnet,
  base: base
};

// EIP-1193 Provider type for internal use
type EIP1193Provider = NonNullable<typeof window.ethereum>;

const useEthWalletInstance = () => {
  const queryClient = useQueryClient();

  // Provider detection
  const hasWindowEthereum = computed(() => !!window.ethereum);
  const hasKeplrEthereum = computed(() => !!window.keplr?.ethereum);
  const hasLeapEthereum = computed(() => !!window.leap?.ethereum);
  const hasAnyProvider = computed(() => hasWindowEthereum.value || hasKeplrEthereum.value || hasLeapEthereum.value);

  // Detect specific wallet types from window.ethereum
  const isMetaMask = computed(() => !!window.ethereum?.isMetaMask);
  const isCoinbase = computed(() => !!window.ethereum?.isCoinbaseWallet);
  const isRabby = computed(() => !!window.ethereum?.isRabby);

  const loggedIn = ref(false);
  const address = ref("");
  const chainId = ref<number | null>(null);
  const used = ref<EthWallets | null>(null);
  const walletClient = ref<WalletClient | null>(null);

  // Store the active provider reference
  const activeProvider: Ref<EIP1193Provider | null> = ref(null);

  // Get available wallets
  const availableWallets = computed((): EthWallets[] => {
    const wallets: EthWallets[] = [];
    if (hasKeplrEthereum.value) wallets.push(EthWallets.keplr);
    if (hasLeapEthereum.value) wallets.push(EthWallets.leap);
    if (hasWindowEthereum.value) {
      if (window.ethereum?.isMetaMask) wallets.push(EthWallets.metamask);
      else if (window.ethereum?.isCoinbaseWallet) wallets.push(EthWallets.coinbase);
      else if (window.ethereum?.isRabby) wallets.push(EthWallets.rabby);
      else wallets.push(EthWallets.generic);
    }
    return wallets;
  });

  // Get the provider for a specific wallet type
  const getProviderForWallet = (wallet: EthWallets): EIP1193Provider | null => {
    switch (wallet) {
      case EthWallets.keplr:
        return window.keplr?.ethereum ?? null;
      case EthWallets.leap:
        return window.leap?.ethereum ?? null;
      case EthWallets.metamask:
      case EthWallets.coinbase:
      case EthWallets.rabby:
      case EthWallets.generic:
        return window.ethereum ?? null;
    }
  };

  const signOut = () => {
    address.value = "";
    chainId.value = null;
    used.value = null;
    loggedIn.value = false;
    walletClient.value = null;
    activeProvider.value = null;
  };

  const handleChainChanged = (newChainId: unknown) => {
    const parsedChainId = typeof newChainId === "string"
      ? parseInt(
        newChainId,
        16
      )
      : newChainId as number;
    chainId.value = parsedChainId;

    if (activeProvider.value) {
      const chain = parsedChainId === base.id
        ? base
        : mainnet;
      walletClient.value = createWalletClient({
        chain,
        transport: custom(activeProvider.value)
      });
    }

    queryClient.invalidateQueries({ queryKey: ["eth-balance"] });
    queryClient.invalidateQueries({ queryKey: ["eth-atone-balance"] });
    queryClient.invalidateQueries({ queryKey: ["eth-photon-balance"] });
  };

  const refreshAddress = async () => {
    console.log("Ethereum wallet changed, refreshing");
    if (loggedIn.value && activeProvider.value) {
      try {
        const accounts = await activeProvider.value.request({
          method: "eth_accounts"
        }) as string[];

        if (accounts && accounts.length > 0) {
          address.value = accounts[0];
        } else {
          signOut();
        }
      } catch {
        signOut();
      }
    }
    await nextTick();
    queryClient.invalidateQueries({ queryKey: ["eth-balance"] });
    queryClient.invalidateQueries({ queryKey: ["eth-atone-balance"] });
    queryClient.invalidateQueries({ queryKey: ["eth-photon-balance"] });
  };

  const setupEventListeners = (provider: EIP1193Provider) => {
    if (provider.on) {
      provider.on(
        "accountsChanged",
        () => refreshAddress()
      );
      provider.on(
        "chainChanged",
        handleChainChanged
      );
    }
  };

  const connect = async (
    wallet: EthWallets,
    targetChain: SupportedChain = "ethereum",
    signal?: AbortSignal
  ) => {
    if (signal?.aborted) {
      return Promise.reject(new DOMException(
        "Aborted",
        "AbortError"
      ));
    }

    const abortHandler = () => {
      signOut();
    };
    signal?.addEventListener(
      "abort",
      abortHandler
    );

    try {
      const provider = getProviderForWallet(wallet);
      if (!provider) {
        throw new Error(`No Ethereum provider found for ${wallet}. Please install the wallet extension.`);
      }

      const accounts = await provider.request({
        method: "eth_requestAccounts"
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please unlock your wallet.");
      }

      const currentChainId = await provider.request({
        method: "eth_chainId"
      }) as string;

      const targetChainConfig = chainConfig[targetChain];
      const targetChainIdHex = `0x${targetChainConfig.id.toString(16)}`;

      if (currentChainId !== targetChainIdHex) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainIdHex }]
          });
        } catch (switchError: unknown) {
          if ((switchError as { code: number }).code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetChainIdHex,
                  chainName: targetChainConfig.name,
                  nativeCurrency: targetChainConfig.nativeCurrency,
                  rpcUrls: [targetChainConfig.rpcUrls.default.http[0]],
                  blockExplorerUrls: [targetChainConfig.blockExplorers?.default.url]
                }
              ]
            });
          } else {
            throw switchError;
          }
        }
      }

      const client = createWalletClient({
        chain: targetChainConfig,
        transport: custom(provider)
      });

      address.value = accounts[0];
      chainId.value = targetChainConfig.id;
      loggedIn.value = true;
      used.value = wallet;
      walletClient.value = client;
      activeProvider.value = provider;

      if (signal?.aborted) {
        abortHandler();
      }

      setupEventListeners(provider);
    } catch (e) {
      throw new Error("Could not connect to Ethereum wallet: " + e);
    } finally {
      signal?.removeEventListener(
        "abort",
        abortHandler
      );
    }
  };

  const getBalance = async (): Promise<string> => {
    if (!activeProvider.value || !address.value) {
      return "0";
    }
    try {
      const balance = await activeProvider.value.request({
        method: "eth_getBalance",
        params: [
          address.value,
          "latest"
        ]
      }) as string;
      return formatEther(BigInt(balance));
    } catch {
      return "0";
    }
  };

  const getTokenBalance = async (
    tokenAddress: `0x${string}`,
    decimals: number = 18
  ): Promise<string> => {
    if (!activeProvider.value || !address.value) {
      return "0";
    }
    try {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address.value as `0x${string}`]
      });

      const result = await activeProvider.value.request({
        method: "eth_call",
        params: [
          {
            to: tokenAddress,
            data
          },
          "latest"
        ]
      }) as string;

      const balance = BigInt(result);
      return formatUnits(
        balance,
        decimals
      );
    } catch {
      return "0";
    }
  };

  const ensureAllowance = async (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint,
    src: SupportedChain = "ethereum"
  ): Promise<void> => {
    if (!activeProvider.value || !address.value || !walletClient.value) {
      throw new Error("Wallet not connected");
    }

    const chain = chainConfig[src];

    const allowanceData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "allowance",
      args: [
        address.value as `0x${string}`,
        spenderAddress
      ]
    });

    const result = await activeProvider.value.request({
      method: "eth_call",
      params: [
        {
          to: tokenAddress,
          data: allowanceData
        },
        "latest"
      ]
    }) as string;

    const currentAllowance = BigInt(result);
    if (currentAllowance >= amount) {
      return;
    }

    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [
        spenderAddress,
        amount
      ]
    });

    const hash = await walletClient.value.sendTransaction({
      account: address.value as `0x${string}`,
      to: tokenAddress,
      data: approveData,
      chain
    });

    // Wait for approval tx to be mined before proceeding
    let receipt = null;
    while (!receipt) {
      await new Promise((resolve) => setTimeout(
        resolve,
        2000
      ));
      receipt = await activeProvider.value.request({
        method: "eth_getTransactionReceipt",
        params: [hash]
      });
    }
  };

  const getAtoneBalance = async (): Promise<string> => {
    if (!ERC20_TOKENS.ATONE.address) return "0";
    return getTokenBalance(
      ERC20_TOKENS.ATONE.address,
      ERC20_TOKENS.ATONE.decimals
    );
  };

  const getPhotonBalance = async (): Promise<string> => {
    if (!ERC20_TOKENS.PHOTON.address) return "0";
    return getTokenBalance(
      ERC20_TOKENS.PHOTON.address,
      ERC20_TOKENS.PHOTON.decimals
    );
  };

  const sendTransaction = async (tx: {
    to: string;
    value?: bigint;
    data?: `0x${string}`;
  }) => {
    if (!walletClient.value || !address.value) {
      throw new Error("Wallet not connected");
    }

    const hash = await walletClient.value.sendTransaction({
      account: address.value as `0x${string}`,
      to: tx.to as `0x${string}`,
      value: tx.value,
      data: tx.data,
      chain: chainId.value === base.id
        ? base
        : mainnet
    });

    return hash;
  };

  const signMessage = async (message: string) => {
    if (!walletClient.value || !address.value) {
      throw new Error("Wallet not connected");
    }

    const signature = await walletClient.value.signMessage({
      account: address.value as `0x${string}`,
      message
    });

    return signature;
  };

  const switchChain = async (targetChain: SupportedChain) => {
    if (!activeProvider.value) {
      throw new Error("No Ethereum provider connected");
    }

    const targetChainConfig = chainConfig[targetChain];
    const targetChainIdHex = `0x${targetChainConfig.id.toString(16)}`;

    try {
      await activeProvider.value.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainIdHex }]
      });
      chainId.value = targetChainConfig.id;

      walletClient.value = createWalletClient({
        chain: targetChainConfig,
        transport: custom(activeProvider.value)
      });
    } catch (switchError: unknown) {
      if ((switchError as { code: number }).code === 4902) {
        await activeProvider.value.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: targetChainIdHex,
              chainName: targetChainConfig.name,
              nativeCurrency: targetChainConfig.nativeCurrency,
              rpcUrls: [targetChainConfig.rpcUrls.default.http[0]],
              blockExplorerUrls: [targetChainConfig.blockExplorers?.default.url]
            }
          ]
        });
        chainId.value = targetChainConfig.id;
      } else {
        throw switchError;
      }
    }
  };

  return {
    address,
    chainId,
    loggedIn,
    hasAnyProvider,
    hasWindowEthereum,
    hasKeplrEthereum,
    hasLeapEthereum,
    isMetaMask,
    isCoinbase,
    isRabby,
    used,
    availableWallets,
    walletClient,
    signOut,
    connect,
    getBalance,
    getTokenBalance,
    getAtoneBalance,
    getPhotonBalance,
    sendTransaction,
    signMessage,
    switchChain,
    ensureAllowance
  };
};

let ethWalletInstance: ReturnType<typeof useEthWalletInstance>;

export const useEthWallet = () => {
  if (!ethWalletInstance) {
    ethWalletInstance = useEthWalletInstance();
  }
  return ethWalletInstance;
};
