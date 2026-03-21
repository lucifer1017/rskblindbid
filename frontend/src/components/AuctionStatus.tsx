"use client";

import { formatEther, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";

import { BLINDBID_ABI, BLINDBID_ADDRESS } from "@/lib/constants";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AuctionStatus() {
  const { data, isLoading, isError, error } = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: BLINDBID_ADDRESS,
        abi: BLINDBID_ABI,
        chainId: 31,
        functionName: "auctionEnded",
      },
      {
        address: BLINDBID_ADDRESS,
        abi: BLINDBID_ABI,
        chainId: 31,
        functionName: "highestBid",
      },
      {
        address: BLINDBID_ADDRESS,
        abi: BLINDBID_ABI,
        chainId: 31,
        functionName: "highestBidder",
      },
    ],
  });

  if (isLoading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="space-y-3">
          <div className="h-4 w-52 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-zinc-200" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Failed to load auction status{error?.message ? `: ${error.message}` : "."}
      </section>
    );
  }

  const ended = data?.[0];
  const highestBid = data?.[1];
  const highestBidder = data?.[2];

  const formattedHighestBid = highestBid !== undefined ? `${formatEther(highestBid)} rBTC` : "--";
  const displayBidder =
    highestBidder && highestBidder !== zeroAddress ? shortAddress(highestBidder) : "No highest bidder yet";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Auction Status</h2>
        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            ended ? "bg-zinc-900 text-white" : "bg-orange-100 text-orange-700"
          }`}
        >
          {ended ? "Ended" : "Live"}
        </span>
      </header>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-600">Auction Ended</dt>
          <dd className="font-medium text-zinc-900">{ended ? "Yes" : "No"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-600">Highest Bid</dt>
          <dd className="font-medium text-zinc-900">{formattedHighestBid}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-600">Highest Bidder</dt>
          <dd className="font-mono text-xs font-medium text-zinc-900">{displayBidder}</dd>
        </div>
      </dl>
    </section>
  );
}
