"use client";

import { useConnection, useConnect, useConnectors, useDisconnect } from "wagmi";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletControls() {
  const connection = useConnection();
  const { mutate: connect, isPending, error } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const connectors = useConnectors();

  const isConnected = connection.isConnected;
  const address = connection.address;

  const injectedConnector = connectors.find((connector) => connector.type === "injected");

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 h-1 w-20 rounded-full bg-orange-400" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black tracking-tight text-zinc-900">Wallet</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {isConnected && address ? `Connected: ${shortAddress(address)}` : "Connect to submit bids"}
          </p>
        </div>

        {isConnected ? (
          <button
            type="button"
            onClick={() => disconnect()}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm"
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!injectedConnector) {
                return;
              }
              connect({ connector: injectedConnector });
            }}
            disabled={isPending || !injectedConnector}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-zinc-800 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error.message}</p> : null}
    </section>
  );
}
