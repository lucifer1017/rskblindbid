"use client";

import { SyntheticEvent, useMemo } from "react";
import { useConnection, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { BLINDBID_ABI, BLINDBID_ADDRESS } from "@/lib/constants";

const CHAIN_ID = 31;
const ROOTSTOCK_TESTNET_EXPLORER_TX_URL = "https://explorer.testnet.rootstock.io/tx/";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message ?? "";
    const normalized = message.toLowerCase();

    if (normalized.includes("reverted") || normalized.includes("internal json-rpc")) {
      return "Transaction cannot be executed right now. The auction may have already been settled.";
    }

    return message;
  }

  return "Transaction cannot be executed right now. The auction may have already been settled.";
}

export default function SettleAuction() {
  const connection = useConnection();
  const isConnected = connection.status === "connected";
  const chainId = connection.chainId;
  const wrongNetwork = isConnected && chainId !== CHAIN_ID;

  const {
    data: simulation,
    error: simulationError,
    isLoading: isSimulating,
  } = useSimulateContract({
    address: BLINDBID_ADDRESS,
    abi: BLINDBID_ABI,
    chainId: CHAIN_ID,
    functionName: "settleAuction",
    query: { enabled: isConnected && !wrongNetwork },
  });

  const { data: txHash, error: writeError, isPending, mutate: writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: CHAIN_ID,
  });

  const isBusy = isPending || isConfirming;
  const hasSimulationError = !!simulationError;

  const successMessage = useMemo(() => {
    if (!isConfirmed || !txHash) {
      return null;
    }

    return `Settlement successful. Tx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
  }, [isConfirmed, txHash]);

  const explorerTxUrl = txHash ? `${ROOTSTOCK_TESTNET_EXPLORER_TX_URL}${txHash}` : null;

  function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!simulation?.request) {
      return;
    }

    writeContract(simulation.request);
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 h-1 w-20 rounded-full bg-blue-600" />
      <header className="mb-4">
        <h2 className="text-base font-black tracking-tight text-zinc-900">Settle Auction</h2>
        <p className="mt-1 text-sm text-zinc-600">Finalize the auction and release the winning bid to the beneficiary.</p>
      </header>

      {wrongNetwork ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Please switch your wallet to the Rootstock Testnet to settle the auction.
        </p>
      ) : null}

      <form onSubmit={onSubmit}>
        <button
          type="submit"
          disabled={!isConnected || wrongNetwork || isBusy || hasSimulationError || isSimulating}
          className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-zinc-800 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Confirm in Wallet..." : isConfirming ? "Settling..." : "Settle Auction"}
        </button>
      </form>

      {!isConnected ? <p className="mt-3 text-sm text-zinc-600">Connect your wallet to settle the auction.</p> : null}
      {simulationError ? <p className="mt-3 text-sm text-red-600">{getErrorMessage(simulationError)}</p> : null}
      {writeError ? <p className="mt-3 text-sm text-red-600">{getErrorMessage(writeError)}</p> : null}
      {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}
      {isConfirmed && explorerTxUrl ? (
        <a
          href={explorerTxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 transition hover:-translate-y-0.5 hover:border-zinc-400"
        >
          View on Explorer
        </a>
      ) : null}
    </section>
  );
}
