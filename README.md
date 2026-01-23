# AtomOne Staking Portal

The AtomOne Staking Portal is a platform facilitating web-based management of tokens (or stake) delegation, re-delegation, un-delegation operations and claiming of rewards on the AtomOne chain. Prioritizing security, AtomOne encourages the use of CLI commands for interactions with the portal, using your wallet of choice or a public address you can gain immediate access to AtomOne's staking functionalities. 

Our goal with the AtomOne Staking Portal is to empower the community to effortlessly participate in staking thus ensuring the security of the network while making it more accessible to engage, regardless of their technical expertise or background.

## Usage

You can visit the deployed portal at [https://staking.atom.one/](https://staking.atom.one/).

The following is a showcase of the existing functionality.

### Homepage

Homepage loads a list of all validators on the AtomOne chain. They are ordered by total delegation amount with active ones first and inactive ones after.

The list displays the validator moniker, the operator address, the total delegated power, their current status and whether they are currently jailed or not.

The last 3 columns are only available once you have connected your wallet. Either Keplr/Cosmostation or Leap or simply entering your public AtomOne address.

These are your current delegations to that validator, your pending rewards and a list of action buttons: 
- Stake (to delegate to that validator): Brings up a form to enter the amount you wish to delegate.
- Redelegate (to redelegate away from that validator): Brings up a form to enter the amount you wish to redelegate and to select the validator you want to redelegate to.
- Unstake (to undelegate from that validator): Brings up a form to enter the amount you wish to undelegate.
- Claim Rewards (to claim teh rewards from that validator): Brings up a form to claim the rewards from that validator.
  
At the bottom of the validator list there is also a button to Claim All Rewards across all validators.

All the actions above can be completed by either signing with the connected wallet (Keplr/Leap/Cosmostation) or generating a CLI command to build the Tx using the `atomoned` executable and signing securely offline as described in our [How to submit Transactions securely](https://github.com/atomone-hub/atom.one/blob/main/content/english/submit-tx-securely.md) guide.

## Local deployment

If you don't want to use the deployed version, you can deploy it locally. The only requirements are `node` v18+ and `pnpm`.

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

Please use [Github Issues](https://github.com/allinbits/atomone-staking-portal/issues) to inform us of any bugs or issues you encounter and to request features and improvements.

Thank you.