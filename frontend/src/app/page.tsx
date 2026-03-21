import AuctionStatus from "@/components/AuctionStatus";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <main className="w-full max-w-xl">
        <AuctionStatus />
      </main>
    </div>
  );
}
