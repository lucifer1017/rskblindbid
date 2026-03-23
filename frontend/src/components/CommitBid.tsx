"use client";

import { FormEvent, useMemo, useState } from "react";
import { encodePacked, keccak256, parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { BLINDBID_ABI, BLINDBID_ADDRESS } from "@/lib/constants";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while preparing the transaction.";
}

export default function CommitBid() {
  const [trueBid, setTrueBid] = useState("");
  const [secretPassword, setSecretPassword] = useState("");
  const [dummyDeposit, setDummyDeposit] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { isConnected } = useAccount();

  const { data: txHash, error: writeError, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: 31,
  });

  const isBusy = isPending || isConfirming;
  const canSubmit = trueBid.trim() !== "" && secretPassword.trim() !== "" && dummyDeposit.trim() !== "";

  const successMessage = useMemo(() => {
    if (!isConfirmed || !txHash) {
      return null;
    }

    return `Commit successful. Tx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
  }, [isConfirmed, txHash]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      const normalizedTrueBid = trueBid.trim();
      const normalizedSecret = secretPassword.trim();
      const normalizedDummyDeposit = dummyDeposit.trim();

      if (normalizedSecret === "") {
        setFormError("Secret Password is required.");
        return;
      }

      const parsedTrueBid = parseEther(normalizedTrueBid);
      const parsedDummyDeposit = parseEther(normalizedDummyDeposit);

      if (parsedTrueBid <= BigInt(0)) {
        setFormError("True Bid Amount must be greater than 0.");
        return;
      }

      if (parsedDummyDeposit <= parsedTrueBid) {
        setFormError("Dummy Deposit must be greater than True Bid Amount.");
        return;
      }

      const blindedHash = keccak256(
        encodePacked(["uint256", "string"], [parsedTrueBid, normalizedSecret]),
      );

      writeContract({
        address: BLINDBID_ADDRESS,
        abi: BLINDBID_ABI,
        chainId: 31,
        functionName: "commit",
        args: [blindedHash],
        value: parsedDummyDeposit,
      });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 h-1 w-20 rounded-full bg-orange-400" />
      <header className="mb-4">
        <h2 className="text-base font-black tracking-tight text-zinc-900">Commit Bid</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Submit a blinded hash using your true bid and secret password.
        </p>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-800">True Bid Amount (tRBTC)</span>
          <input
            type="text"
            inputMode="decimal"
            value={trueBid}
            onChange={(event) => setTrueBid(event.target.value)}
            placeholder="e.g. 0.15"
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white"
            disabled={isBusy}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-800">Secret Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={secretPassword}
              onChange={(event) => setSecretPassword(event.target.value)}
              placeholder="Enter secret phrase"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 pr-16 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white"
              disabled={isBusy}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
              disabled={isBusy}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-800">Dummy Deposit (tRBTC)</span>
          <input
            type="text"
            inputMode="decimal"
            value={dummyDeposit}
            onChange={(event) => setDummyDeposit(event.target.value)}
            placeholder="e.g. 0.25"
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white"
            disabled={isBusy}
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || isBusy || !isConnected}
          className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-zinc-800 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Confirm in Wallet..." : isConfirming ? "Committing..." : "Commit Hidden Bid"}
        </button>
      </form>

      {!isConnected ? <p className="mt-3 text-sm text-zinc-600">Connect your wallet to commit a bid.</p> : null}
      {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
      {writeError ? <p className="mt-3 text-sm text-red-600">{getErrorMessage(writeError)}</p> : null}
      {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}
    </section>
  );
}
