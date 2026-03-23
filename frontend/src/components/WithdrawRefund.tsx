"use client";

import { SyntheticEvent, useEffect, useMemo } from "react";
import { formatEther } from "viem";
import { useConnection, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { BLINDBID_ABI, BLINDBID_ADDRESS } from "@/lib/constants";

const ROOTSTOCK_TESTNET_EXPLORER_TX_URL = "https://explorer.testnet.rootstock.io/tx/";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while preparing the transaction.";
}

export default function WithdrawRefund() {
  const connection = useConnection();
  const isConnected = connection.status === "connected";
  const address = connection.address;

  const {
    data: pendingReturns,
    error: readError,
    refetch,
  } = useReadContract({
    address: BLINDBID_ADDRESS,
    abi: BLINDBID_ABI,
    chainId: 31,
    functionName: "pendingReturns",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: txHash, error: writeError, isPending, mutate: writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: 31,
  });

  useEffect(() => {
    if (!isConfirmed) {
      return;
    }

    void refetch();
  }, [isConfirmed, refetch]);

  const isBusy = isPending || isConfirming;
  const pendingAmount = pendingReturns ?? BigInt(0);
  const hasRefund = pendingAmount > BigInt(0);

  const refundLabel = useMemo(() => {
    if (!hasRefund) {
      return "No funds available to withdraw.";
    }

    return `${formatEther(pendingAmount)} tRBTC available`;
  }, [hasRefund, pendingAmount]);

  const successMessage = useMemo(() => {
    if (!isConfirmed || !txHash) {
      return null;
    }

    return `Withdrawal successful. Tx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
  }, [isConfirmed, txHash]);

  const explorerTxUrl = txHash ? `${ROOTSTOCK_TESTNET_EXPLORER_TX_URL}${txHash}` : null;

  function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    writeContract({
      address: BLINDBID_ADDRESS,
      abi: BLINDBID_ABI,
      chainId: 31,
      functionName: "withdraw",
      args: [],
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 h-1 w-20 rounded-full bg-emerald-500" />
      <header className="mb-4">
        <h2 className="text-base font-black tracking-tight text-zinc-900">Withdraw Refund</h2>
        <p className="mt-1 text-sm text-zinc-600">Withdraw your pending outbid deposit from the contract.</p>
      </header>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">{refundLabel}</div>

      <form className="mt-4" onSubmit={onSubmit}>
        <button
          type="submit"
          disabled={isBusy || !isConnected || !hasRefund}
          className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-zinc-800 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Confirm in Wallet..." : isConfirming ? "Withdrawing..." : "Withdraw Refund"}
        </button>
      </form>

      {!isConnected ? <p className="mt-3 text-sm text-zinc-600">Connect your wallet to view and withdraw refunds.</p> : null}
      {readError ? <p className="mt-3 text-sm text-red-600">{getErrorMessage(readError)}</p> : null}
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
