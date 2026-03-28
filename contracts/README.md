# BlindBid — smart contracts

This package contains the **BlindBid** Solidity contract and Hardhat tooling to compile, test, and deploy it on **Rootstock** (RSK).

## What the contract does

`BlindBid` implements a **sealed-bid auction** with two on-chain phases:

1. **Commit phase** — Bidders call `commit(blindedBid)` with RBTC. Each bid is a hash of the real amount plus a secret; other participants cannot see amounts until reveal.
2. **Reveal phase** — After the commit window closes, bidders call `reveal(amount, secret)`. The contract checks the hash, compares the revealed amount to the deposit, and tracks the highest valid bid.

After reveal ends, anyone can call `settleAuction()` to mark the auction finished and send the winning bid to the **beneficiary**. Losers and outbid participants recover funds through `withdraw()` via `pendingReturns`.

Constructor parameters (also driven by Ignition `parameters.json`):

- `commitDurationInSeconds` — length of the commit window from deployment time.
- `revealDurationInSeconds` — length of the reveal window after commit ends.
- `beneficiary` — address that receives the highest bid when the auction is settled.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- An **Alchemy** account — create an app for **Rootstock** and use its HTTPS RPC URLs for testnet (and mainnet if you ever need it). See [Alchemy](https://www.alchemy.com/) and their Rootstock network docs for the exact dashboard steps.
- A deployer wallet with **test RBTC** on Rootstock Testnet for gas.

## Install

From the repository root:

```bash
cd contracts
npm install
```

## Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Edit `.env` in the `contracts` folder:

| Variable | Required for this project | Description |
|----------|---------------------------|-------------|
| `RSK_TESTNET_RPC_URL` | **Yes** (for `rskTestnet` deploys) | HTTPS RPC URL for Rootstock Testnet — use your Alchemy Rootstock Testnet endpoint. |
| `RSK_MAINNET_RPC_URL` | Optional | Only needed if you deploy to Rootstock Mainnet (`rskMainnet`). Not required for a testnet-only workflow. |
| `PRIVATE_KEY` | **Yes** | Hex private key of the deployer account (no `0x` prefix is fine if your tooling accepts both; Hardhat typically expects `0x...`). **Never commit this file.** |

Hardhat loads these via `dotenv` from `.env` in the `contracts` directory (see `hardhat.config.ts`).

## Compile and test (optional)

```bash
npx hardhat compile
npx hardhat test
```

## Deploy with Ignition and `parameters.json`

Deployment uses [Hardhat Ignition](https://hardhat.org/ignition) and `ignition/parameters.json`. The module `ignition/modules/BlindBid.ts` reads the `BlindBidModule` section from that file.

Default durations in the repo are **240 seconds** for commit and reveal (you can change them before deploying).

### Option 1: Default beneficiary (deployer’s wallet)

If you omit `beneficiary`, the module uses **Hardhat account index 0** — i.e. the address derived from `PRIVATE_KEY` — as the beneficiary.

**1. Ensure `ignition/parameters.json` looks like this:**

```json
{
  "BlindBidModule": {
    "commitDurationInSeconds": 240,
    "revealDurationInSeconds": 240
  }
}
```

**2. Run the deployment command:**

```bash
npx hardhat ignition deploy ignition/modules/BlindBid.ts --network rskTestnet --parameters ignition/parameters.json
```

---

### Option 2: Custom beneficiary

To send the winning bid to another address (treasury, multisig, seller wallet, etc.), set `beneficiary` explicitly.

**1. Add `beneficiary` to `ignition/parameters.json`:**

```json
{
  "BlindBidModule": {
    "commitDurationInSeconds": 240,
    "revealDurationInSeconds": 240,
    "beneficiary": "0xYourCustomWalletAddressHere"
  }
}
```

Use a valid **checksummed or lowercase** Rootstock address string.

**2. Run the same deployment command:**

```bash
npx hardhat ignition deploy ignition/modules/BlindBid.ts --network rskTestnet --parameters ignition/parameters.json
```

---

## Verified contract (reference deployment)

A previously verified deployment on **Rootstock Testnet** is available on Blockscout:

[Verified BlindBid on Rootstock Testnet](https://rootstock-testnet.blockscout.com/address/0xc966332872c9be7d96d69df388d88305f5a040b6?tab=contract)

New deployments will have a **different contract address**; use Blockscout for your chain to verify source for each new deployment if needed.
