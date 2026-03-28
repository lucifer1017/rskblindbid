"use client";

import "@getpara/react-sdk-lite/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";

import { createWagmiConfig } from "@/lib/wagmi";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const config = useMemo(() => createWagmiConfig(queryClient), [queryClient]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
