# BlindBid — frontend

Next.js dashboard for the **BlindBid** sealed-bid auction on **Rootstock Testnet** (chain ID **31**). Users connect a wallet, commit hashed bids with RBTC deposits, reveal during the reveal window, then settle and withdraw as the contract allows.

## Stack

- **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS**
- **Wagmi** + **Viem** for reads and writes to the deployed `BlindBid` contract
- **Para** ([`@getpara/react-sdk-lite`](https://docs.getpara.com/)) for wallet connection (email, Google, phone, and browser wallets via the Para modal), integrated with Wagmi through `@getpara/wagmi-v2-connector`
- **TanStack React Query** for async / caching (required by Wagmi)

## Prerequisites

- Node.js (LTS recommended) and npm
- A **Para** API key from the [Para Developer Portal](https://developer.getpara.com/)
- A **Rootstock Testnet** HTTPS RPC URL — the example env file points to [Rootstock’s RPC dashboard](https://dashboard.rpc.rootstock.io/); you can also use another provider (e.g. Alchemy) if you prefer

## Install

From the repository root:

```bash
cd frontend
npm install
```

The `postinstall` script runs Para’s `setup-para` helper. This project includes an `.npmrc` with `legacy-peer-deps=true` so npm can resolve Para-related peer ranges alongside Wagmi 3; keep that file when cloning.

## Environment variables

Copy the example file and adjust values:

```bash
cp .env.example .env.local
```

Next.js exposes only variables prefixed with `NEXT_PUBLIC_` to the browser.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PARA_API_KEY` | Yes | Para project API key. |
| `NEXT_PUBLIC_ROOTSTOCK_TESTNET_RPC_URL` | Yes | HTTPS RPC URL for Rootstock Testnet (see [Rootstock RPC dashboard](https://dashboard.rpc.rootstock.io/) or your provider). |
| `NEXT_PUBLIC_PARA_ENVIRONMENT` | Yes | Para environment, e.g. `BETA` or `PROD` (must match how your Para app is configured). |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Recommended | [WalletConnect Cloud](https://cloud.walletconnect.com/) project ID. Improves WalletConnect-based wallets in the Para modal and removes a common console warning. |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server ([http://localhost:3000](http://localhost:3000)). |
| `npm run build` | Production build. |
| `npm run start` | Run the production server (after `build`). |
| `npm run lint` | ESLint. |

## Project layout (high level)

| Path | Role |
|------|------|
| `src/app/layout.tsx` | Root layout, fonts, wraps the tree with `Providers`. |
| `src/app/page.tsx` | Home dashboard: header plus grid of **Wallet**, **Auction status**, and **Auction actions**. |
| `src/components/Providers.tsx` | Client providers: Wagmi, React Query, Para styles import, and Wagmi config factory. |
| `src/components/WalletControls.tsx` | Connect / disconnect, copy address; drives the Para modal and Wagmi connection recovery. |
| `src/components/AuctionStatus.tsx` | Read-only summary: auction ended flag, highest bid, highest bidder (refreshed on an interval). |
| `src/components/AuctionManager.tsx` | Loads `commitEndTime`, `revealEndTime`, and `auctionEnded` from chain, then shows the right action UI by phase. |
| `src/components/CommitBid.tsx` | Commit-phase form: blinded bid hash and RBTC deposit. |
| `src/components/RevealBid.tsx` | Reveal-phase form: amount and secret to open the commitment. |
| `src/components/SettleAuction.tsx` | Calls `settleAuction` after the reveal window ends. |
| `src/components/WithdrawRefund.tsx` | Calls `withdraw` for `pendingReturns`. |
| `src/lib/constants.ts` | Deployed **`BLINDBID_ADDRESS`** and **`BLINDBID_ABI`** used across components. |
| `src/lib/wagmi.ts` | Builds Wagmi config: Rootstock Testnet, Para connector + injected connector, env validation. |
| `src/lib/para-connector-modal.tsx` | Custom Para modal mount for the Wagmi connector (Rootstock chain + external wallet list). |

After you deploy a **new** contract from `../contracts`, update `BLINDBID_ADDRESS` in `src/lib/constants.ts` (and keep the ABI in sync if the contract interface changes).


