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
      Breakdown: {
        moniker: "Moniker",
        voter: "Voter",
        answer: "Answer",
        txHash: "TX Hash",
        weight: "Weight",
        time: "Time",
        hasNotVoted: "HAS NOT VOTED"
      },
      FooterSection: {
        cta: "Be a part of the conversation"
      },
      Search: {
        placeholder: "Search Proposal"
      },
      Delegate: {
        cta: "Stake",
        delegated: "You staked",
        error: "Error"
      },
      Mint: {
        cta: "Mint Photon",
        minted: "Minted",
        toReceive: "You will receive:",
        error: "Error"
      },
      Claim: {
        cta: "Claim Rewards",
        ctamulti: "Claim All Rewards",
        claimed: "Claimed Rewards",
        error: "Error"
      },
      Redelegate: {
        cta: "Redelegate",
        redelegated: "You redelegated",
        error: "Error"
      },
      Undelegate: {
        cta: "Unstake",
        undelegated: "You unstaked",
        error: "Error"
      },
      ProposalVote: {
        cta: "Vote",
        voted: "You voted",
        error: "Error",
        weightedInstructions: "Define weight for each of the voting options. The sum of weights must be equal to 1."
      },
      ProposalDeposit: {
        cta: "Deposit",
        act: "deposited",
        deposited: "You deposited",
        error: "Error",
        instructions: "Enter deposit amount"
      },
      VotePanel: {
        breakdown: "Breakdown",
        noVotes: "No votes have been recorded."
      },
      GithubComments: {
        signInLong: "Sign in via GitHub to be able to post messages",
        signIn: "Github Sign In",
        signOut: "Sign Out",
        proposalDiscussion: "Proposal Discussion",
        upvoteRatio: "Upvote Ratio",
        totalComments: "Total Comment(s)",
        viewOnGithub: "View on GitHub",
        postComment: "Post Comment"
      },
      GithubLinks: {
        communityLinks: "Community Links",
        signIn: "GitHub Sign In",
        signOut: "GitHub Sign Out",
        addLink: "Add Link",
        upvoteRatio: "Upvote Ratio",
        totalLinks: "Total Link(s)",
        link: "Link",
        invalidHttpsLink: "Link is not valid, must be HTTPS",
        invalidLinkContentLength: "Content length must be at least 32 characters",
        cancel: "Cancel",
        post: "Post"
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
      },
      tabs: {
        Info: "Info",
        Voters: "Voters",
        Discussions: "Discussions",
        Description: "Description",
        Links: "Links",
        Yes: "Yes",
        No: "No",
        Veto: "Veto",
        Abstain: "Abstain"
      }
    }
  }
};
