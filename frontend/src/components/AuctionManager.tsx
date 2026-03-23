"use client";

import { useEffect, useState } from "react";
import { useReadContracts } from "wagmi";

import CommitBid from "@/components/CommitBid";
import { BLINDBID_ABI, BLINDBID_ADDRESS } from "@/lib/constants";

const CHAIN_ID = 31;

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
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
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
  const hasInvalidData =
    commitEndTime === undefined || revealEndTime === undefined || auctionEnded === undefined;

  if (hasInvalidData) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
        Auction timing is temporarily unavailable. Please refresh.
      </div>
    );
  }

  if (auctionEnded) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-5">Auction Settled. Winners paid.</div>;
  }

  if (currentTime < commitEndTime) {
    return <CommitBid />;
  }

  if (currentTime >= commitEndTime && currentTime < revealEndTime) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        Reveal Phase Active (Component coming soon)
        <p className="mt-2 text-xs text-zinc-500">Phase view uses your local clock for timing updates.</p>
      </div>
    );
  }

  return <div className="rounded-xl border border-zinc-200 bg-white p-5">Auction Ended. Awaiting Settlement.</div>;
}
