import { createConfig, http } from "wagmi";
import { rootstockTestnet } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [rootstockTestnet],
  transports: {
    [rootstockTestnet.id]: http(),
  },
  ssr: true,
});
