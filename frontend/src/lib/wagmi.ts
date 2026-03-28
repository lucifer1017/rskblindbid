import { createParaConnector } from "@getpara/wagmi-v2-connector";
import ParaWeb, { Environment } from "@getpara/react-sdk-lite";
import type { QueryClient } from "@tanstack/react-query";
import { createConfig, http, type CreateConnectorFn } from "wagmi";
import { injected } from "wagmi/connectors";
import { rootstockTestnet } from "wagmi/chains";

import { createParaConnectorRenderModal } from "./para-connector-modal";

const chains = [rootstockTestnet] as const;
let paraClientRef: ParaWeb | null = null;

export { rootstockTestnet };
export function getParaClient() {
  return paraClientRef;
}

function requireEnv(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(`${name} is not set. Add it to frontend/.env.local`);
  }
  return v;
}

function parseParaEnvironment(raw: string | undefined): Environment {
  const v = (raw ?? "BETA").trim().toUpperCase();
  if (v === "PROD" || v === "PRODUCTION") return Environment.PROD;
  if (v === "SANDBOX") return Environment.SANDBOX;
  if (v === "DEV") return Environment.DEV;
  return Environment.BETA;
}

export function createWagmiConfig(queryClient: QueryClient) {
  const rpcUrl = requireEnv(
    "NEXT_PUBLIC_ROOTSTOCK_TESTNET_RPC_URL",
    process.env.NEXT_PUBLIC_ROOTSTOCK_TESTNET_RPC_URL,
  );
  const apiKey = requireEnv("NEXT_PUBLIC_PARA_API_KEY", process.env.NEXT_PUBLIC_PARA_API_KEY);
  const env = parseParaEnvironment(process.env.NEXT_PUBLIC_PARA_ENVIRONMENT);
  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

  const para = new ParaWeb(env, apiKey);
  paraClientRef = para;

  const renderModal = createParaConnectorRenderModal({
    queryClient,
    para,
    appName: "BlindBid",
    rpcUrl,
    chain: rootstockTestnet,
    walletConnectProjectId,
    modalProps: {
      authLayout: ["AUTH:FULL", "EXTERNAL:FULL"],
      disableEmailLogin: false,
      disablePhoneLogin: false,
      oAuthMethods: ["GOOGLE"],
      recoverySecretStepEnabled: true,
      twoFactorAuthEnabled: false,
      onRampTestMode: true,
    },
  });

  const paraOnly = createParaConnector({
    para,
    appName: "BlindBid",
    options: {},
    renderModal,
  }) as CreateConnectorFn;

  return createConfig({
    chains,
    connectors: [paraOnly, injected()],
    transports: {
      [rootstockTestnet.id]: http(rpcUrl),
    },
    ssr: true,
  });
}
