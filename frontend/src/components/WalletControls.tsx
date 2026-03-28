"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect, useReconnect } from "wagmi";
import { getParaClient } from "@/lib/wagmi";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function WalletControls() {
  const account = useAccount();
  const { mutate: connect, isPending, reset } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { reconnect } = useReconnect();

  const accountAddress = account.address;
  const hasAccount = Boolean(accountAddress);

  const para = connectors.find((c) => c.id === "para");

  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetRef = useRef(reset);
  resetRef.current = reset;
  const reconnectRef = useRef(reconnect);
  reconnectRef.current = reconnect;
  const connectorsRef = useRef(connectors);
  connectorsRef.current = connectors;

  const connectAttemptedRef = useRef(false);
  const hasRetriedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const copyAddress = useCallback(async () => {
    if (!accountAddress) return;
    try {
      await navigator.clipboard.writeText(accountAddress);
      setCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [accountAddress]);

  useEffect(() => {
    if (isPending) {
      connectAttemptedRef.current = true;
      return;
    }
    if (!connectAttemptedRef.current) return;
    if (accountAddress) {
      connectAttemptedRef.current = false;
      hasRetriedRef.current = false;
      return;
    }
    if (hasRetriedRef.current) return;

    let cancelled = false;

    const tryRecover = async () => {
      const paraClient = getParaClient();
      if (!paraClient) return;

      try {
        if (typeof window !== "undefined" && window.ethereum) {
          try {
            const mmAccounts = (await window.ethereum.request({
              method: "eth_accounts",
            })) as string[];
            if (!cancelled && mmAccounts && mmAccounts.length > 0) {
              connectAttemptedRef.current = false;
              hasRetriedRef.current = true;
              resetRef.current();
              const all = connectorsRef.current;
              const inj =
                all.find((c) => c.id === "io.metamask") ??
                all.find((c) => c.id === "injected");
              if (inj) reconnectRef.current({ connectors: [inj] });
              return;
            }
          } catch {}
        }

        for (let i = 0; i < 60; i++) {
          if (cancelled) return;

          const loggedIn = await paraClient.isFullyLoggedIn();

          if (!loggedIn) {
            if (i > 10) return;
            await wait(500);
            continue;
          }

          const wallets = paraClient.getWalletsByType("EVM");
          if (wallets.length > 0) {
            if (cancelled) return;
            connectAttemptedRef.current = false;
            hasRetriedRef.current = true;
            resetRef.current();
            const all = connectorsRef.current;
            const paraConn = all.find((c) => c.id === "para");
            if (paraConn) reconnectRef.current({ connectors: [paraConn] });
            return;
          }

          await wait(500);
        }
      } catch {}
    };

    void tryRecover();
    return () => {
      cancelled = true;
    };
  }, [isPending, accountAddress]);

  useEffect(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (!isPending) return;
    watchdogRef.current = setTimeout(() => resetRef.current(), 20_000);
  }, [isPending]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 h-1 w-20 rounded-full bg-orange-400" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-zinc-900">Wallet</h2>
          {hasAccount && accountAddress ? (
            <p className="mt-1 truncate text-sm text-zinc-600" title={accountAddress}>
              <span className="font-mono">{shortAddress(accountAddress)}</span>
              <span className="sr-only"> Full address: {accountAddress}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">Connect to submit bids</p>
          )}
        </div>

        {hasAccount && accountAddress ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm"
              aria-label="Copy wallet address"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <button
              type="button"
              onClick={() => {
                disconnect();
                const paraClient = getParaClient();
                void paraClient?.logout?.();
              }}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              hasRetriedRef.current = false;
              reset();
              if (para) connect({ connector: para });
            }}
            disabled={isPending || !para}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-zinc-800 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isPending ? "Connecting..." : "Connect wallet"}
          </button>
        )}
      </div>
    </section>
  );
}
