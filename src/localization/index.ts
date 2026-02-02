import faqEn from "./faq.en.json";
import privacyEn from "./privacy.en";
import termsEn from "./terms.en";

export const messages = {
  en: {
    homepage: {
      title: "AtomOne Bridging Portal",
      forumLinkText: "forum",
      website: "Website",
      viewFaq: "FAQ",
      viewForums: "Forum",
      viewAuditStatus: "View Audit Status",
      security: "Security",
      auditStatus:
        "Your security is our priority! Click below to view this application's latest audit status and see how we’re working to keep you safe. We encourage you to check the audit status regularly before using the application to ensure you’re always up-to-date on our security measures."
    },
    termspage: {
      title: "Terms of Service",
      content: termsEn
    },
    faqPage: {
      title: "FAQ",
      content: faqEn
    },
    privacypage: {
      title: "Privacy Policy",
      content: privacyEn
    },
    components: {
      ErrorBox: {
        title: "Error",
        message: "Something went wrong...",
        cta: "Please refresh"
      },
      WalletConnect: {
        button: "Connect Wallet",
        cta: "Connect your wallet",
        ctaAddress: "Connect Address",
        balance: "Balance",
        cancel: "Cancel",
        disconnect: "Disconnect wallet",
        connecting: "Connecting wallet",
        wait: "Please wait...",
        trouble: "Troubleshooting",
        retry: "Try again",
        failed: "Connection Failed",
        failedSub: "Was not able to connect to your wallet",
        publicAddressDisclaimer:
          "* Connecting public address doesn't connect to your wallet and is used only for CLI command generation.",
        recommendedWallet: "We recommend connecting with address only",
        otherWallet: "or connect your Wallet. Make sure you have a wallet browser extension enabled.",
        enterAddress: "Enter your AtomOne wallet address",
        addressPlaceholder: "e.g. atone1ad453f23bc2d...",
        noPhoton:
          "You currently have 0 PHOTON. Soon you will only be able to pay with TXs with PHOTON. Click here to learn more and find out how to mint PHOTON."
      },
      EthWalletConnect: {
        button: "Connect ETH Wallet",
        cta: "Connect your Ethereum wallet",
        balance: "Balance",
        network: "Network",
        disconnect: "Disconnect wallet",
        connecting: "Connecting wallet",
        wait: "Please wait...",
        trouble: "Troubleshooting",
        retry: "Try again",
        failed: "Connection Failed",
        failedSub: "Was not able to connect to your Ethereum wallet",
        selectWallet: "Select a wallet to connect",
        cosmosWallets: "Cosmos Wallets with EVM Support",
        evmWallets: "EVM Wallets",
        browserWallet: "Browser Wallet",
        noWallet: "No Ethereum wallet detected. Please install MetaMask, Keplr, or another wallet extension with EVM support."
      },
      FooterSection: {
        cta: "Be a part of the conversation"
      },
      Mint: {
        cta: "Mint Photon",
        minted: "Minted",
        toReceive: "You will receive:",
        error: "Error"
      }
    },
    ui: {
      readMore: "Read More",
      readLess: "Read Less",
      actions: {
        cli: "Copy CLI Command",
        confirm: "or Sign with Wallet",
        signTxSecurely: "See: Why and How should I use the CLI?",
        cancel: "Cancel",
        clicta: "CLI Command",
        copied: "Copied",
        copy: "Copy",
        back: "Back",
        done: "Done"
      },
      buttons: {
        back: "Back"
      }
    }
  }
};
