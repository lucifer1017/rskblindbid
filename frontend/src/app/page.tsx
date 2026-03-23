import AuctionStatus from "@/components/AuctionStatus";
import CommitBid from "@/components/CommitBid";
import WalletControls from "@/components/WalletControls";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-orange-50/50 via-zinc-50 to-zinc-100 px-6 py-10">
      <main className="mx-auto w-full max-w-5xl">
        <header className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md border border-orange-300 bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
              ROOTSTOCK TESTNET
            </span>
            <span className="rounded-md border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
              CHAIN ID 31
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
            BlindBid Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Commit a hidden bid with a masked deposit, then reveal later to protect against front-running.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <WalletControls />
          <AuctionStatus />
          <CommitBid />
        </section>
      </main>
    </div>
  );
}
