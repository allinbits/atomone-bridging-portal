# AtomOne Bridging Portal

The AtomOne Bridging Portal is a platform facilitating web-based cross-chain token transfers between AtomOne and EVM chains (Ethereum, Base). Prioritizing security, AtomOne encourages the use of CLI commands for interactions with the portal. Using your wallet of choice or a public address, you can gain immediate access to AtomOne's bridging functionalities.

Our goal with the AtomOne Bridging Portal is to empower the community to effortlessly move ATONE and PHOTON tokens between AtomOne and Ethereum ecosystems, making cross-chain interactions accessible regardless of technical expertise or background.

## Usage

You can visit the deployed portal at [https://bridge.atom.one/](https://bridge.atom.one/).

The following is a showcase of the existing functionality.

### Homepage

The homepage provides the bridging interface allowing you to transfer tokens between supported chains.

You can connect two types of wallets:
- **Cosmos Wallets** (Keplr, Leap, Cosmostation) - For AtomOne chain interactions
- **Ethereum Wallets** (MetaMask, Coinbase Wallet, Rabby, or Keplr/Leap EVM) - For Ethereum/Base chain interactions

### Supported Routes

The portal supports the following bridging routes:
- **AtomOne → Ethereum**: Bridge ATONE or PHOTON tokens to Ethereum as ERC20 tokens
- **Ethereum → AtomOne**: Bridge ERC20 ATONE or PHOTON tokens back to AtomOne

### Bridging Process

1. Connect your source chain wallet (Cosmos wallet for AtomOne, Ethereum wallet for EVM chains)
2. Select the source and destination chains
3. Choose the token you wish to bridge (ATONE or PHOTON)
4. Enter the amount and recipient address
5. Complete the transaction by signing with your connected wallet or generating a CLI command

All actions can be completed by either signing with the connected wallet or generating a CLI command to build the transaction using the `atomoned` executable and signing securely offline as described in our [How to submit Transactions securely](https://github.com/atomone-hub/atom.one/blob/main/content/english/submit-tx-securely.md) guide.

## Local deployment

If you don't want to use the deployed version, you can deploy it locally. The only requirements are `node` v20+ and `pnpm`.

First, clone the repo using your favorite git tool.

Then install all packages in the repository:

```
pnpm i
```

Finally, spin up a local instance using:

```
pnpm dev
```

## Bugs & Feedback

Please use [Github Issues](https://github.com/allinbits/atomone-bridging-portal/issues) to inform us of any bugs or issues you encounter and to request features and improvements.

Thank you.
