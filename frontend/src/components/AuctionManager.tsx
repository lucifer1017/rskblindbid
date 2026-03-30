"use client";

import { useEffect, useState } from "react";
import { useReadContracts } from "wagmi";

import CommitBid from "@/components/CommitBid";
import RevealBid from "@/components/RevealBid";
import SettleAuction from "@/components/SettleAuction";
import WithdrawRefund from "@/components/WithdrawRefund";
import { BLINDBID_ABI, BLINDBID_ADDRESS } from "@/lib/constants";

const CHAIN_ID = 31;

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function PhaseTimer({
  commitEndTime,
  revealEndTime,
  auctionEnded,
  currentTime,
}: {
  commitEndTime: bigint;
  revealEndTime: bigint;
  auctionEnded: boolean;
  currentTime: number;
}) {
  const commitEnd = Number(commitEndTime);
  const revealEnd = Number(revealEndTime);

  let label: string;
  let countdown: string | null = null;

  if (auctionEnded) {
    label = "Auction settled";
  } else if (currentTime < commitEnd) {
    label = "Commit phase ends in";
    countdown = formatCountdown(commitEnd - currentTime);
  } else if (currentTime < revealEnd) {
    label = "Reveal phase ends in";
    countdown = formatCountdown(revealEnd - currentTime);
  } else {
    label = "Reveal phase ended · Awaiting settlement";
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 h-1 w-20 rounded-full bg-orange-400" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-600">{label}</span>
        {countdown && (
          <span className="font-mono text-xl font-black tracking-tight text-zinc-900">
            {countdown}
          </span>
        )}
      </div>
    </section>
  );
}

export default function AuctionManager() {
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));

  const { data, isLoading, isError } = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: BLINDBID_ADDRESS,
        abi: BLINDBID_ABI,
        chainId: CHAIN_ID,
        functionName: "commitEndTime",
      },
      {
        address: BLINDBID_ADDRESS,
        abi: BLINDBID_ABI,
        chainId: CHAIN_ID,
        functionName: "revealEndTime",
      },
      {
        address: BLINDBID_ADDRESS,
        abi: BLINDBID_ABI,
        chainId: CHAIN_ID,
        functionName: "auctionEnded",
      },
    ],
    query: { refetchInterval: 5000 },
  });

  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-44 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-zinc-200" />
      </section>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Failed to load auction timing. Please refresh and try again.
      </div>
    );
  }

  const commitEndTime = data?.[0];
  const revealEndTime = data?.[1];
  const auctionEnded = data?.[2];

  if (commitEndTime === undefined || revealEndTime === undefined || auctionEnded === undefined) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
        Auction timing is temporarily unavailable. Please refresh.
      </div>
    );
  }

  const commitEnd = Number(commitEndTime);
  const revealEnd = Number(revealEndTime);

  const timer = (
    <PhaseTimer
      commitEndTime={commitEndTime}
      revealEndTime={revealEndTime}
      auctionEnded={auctionEnded}
      currentTime={currentTime}
    />
  );

  if (auctionEnded) {
    return (
      <div className="space-y-6">
        {timer}
        <WithdrawRefund />
      </div>
    );
  }

  if (currentTime < commitEnd) {
    return (
      <div className="space-y-6">
        {timer}
        <CommitBid />
      </div>
    );
  }

  if (currentTime < revealEnd) {
    return (
      <div className="space-y-6">
        {timer}
        <RevealBid />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timer}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-base font-black tracking-tight text-zinc-900">
          Auction Ended. Awaiting Settlement.
        </h3>
        <p className="mb-4 text-sm text-zinc-600">
          The reveal phase is over. Anyone can settle the auction to finalize the winner and enable refunds.
        </p>
        <SettleAuction />
      </div>
      <WithdrawRefund />
    </div>
  );
}
