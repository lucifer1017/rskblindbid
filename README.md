# BlindBid

**BlindBid** is a sealed-bid auction dApp on **Rootstock Testnet**. Bidders commit a hash of their bid plus a secret and lock RBTC as a deposit; only after a fixed window do they reveal amounts on-chain. That **commit–reveal** pattern hides bids during the active phase so others cannot see or front-run them before submission closes.

## Why it exists

Classic on-chain auctions leak bids if amounts are visible early. BlindBid is built for scenarios where **privacy until close** matters—for example fundraising rounds, NFT or asset sales, procurement-style competitions, or any “best offer wins” flow where you want binding bids without signaling.

## How the flow works

1. **Commit** — Each bidder sends `keccak256(amount, secret)` and a deposit (RBTC) before `commitEndTime`.
2. **Reveal** — After commit ends and before `revealEndTime`, bidders reveal `amount` and `secret`; the contract checks the hash and tracks the highest valid bid.
3. **Settle** — After reveal ends, anyone can call `settleAuction` to finalize; the winning bid is sent to the **beneficiary**.
4. **Withdraw** — Non-winners (and others with refunds) pull RBTC via `withdraw` from `pendingReturns`.

The contracts package deploys the Solidity contract; the frontend Next.js app drives wallet connection and contract calls.

## Quick links

| Resource | Link |
|----------|------|
| Verified contract (Rootstock Testnet) | [Blockscout](https://rootstock-testnet.blockscout.com/address/0xc966332872c9be7d96d69df388d88305f5a040b6?tab=contract) |
| Capstone / project page (Hacktivator) | [hacktivator-marketplace.rootstock.io](https://hacktivator-marketplace.rootstock.io/idea/438) |
| Source repository | [github.com/lucifer1017/rskblindbid](https://github.com/lucifer1017/rskblindbid) |
| Replit | [Replit project Link](https://replit.com/@lobamow445/rskblindbid) |


---

## 🛠️ Partner integrations & tooling

- **Para :** Integrated via **Wagmi v3** to improve frontend UX. Para provides embedded **MPC** (multi-party computation) wallets so users can interact with the dApp using simple, seedless Web2-style logins (email / social) instead of requiring browser extensions alone.

- **Alchemy:** Core infrastructure layer—high-performance **RPC** endpoints for reliable communication between the Next.js frontend, deployment tooling, and **Rootstock Testnet**.

- **Cookbook.dev:** Secure registry for battle-tested, audited smart contract primitives. The contract uses OpenZeppelin’s **`ReentrancyGuard`** (sourced through this workflow) to protect the isolated withdrawal patterns.
