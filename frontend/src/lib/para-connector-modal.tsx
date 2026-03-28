"use client";

import type { TExternalWallet } from "@getpara/react-common";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { ParaProvider, setIsOpen } from "@getpara/react-sdk-lite";
import type ParaWeb from "@getpara/react-sdk-lite";
import type { Chain, Transport } from "viem";
import { http } from "wagmi";

type ParaModalGlobalState = {
  root: import("react-dom/client").Root | null;
  container: HTMLElement | null;
};

declare global {
  interface Window {
    __paraModalState?: ParaModalGlobalState;
  }
}

function getModalState(): ParaModalGlobalState {
  if (typeof window === "undefined") return { root: null, container: null };
  if (!window.__paraModalState) {
    window.__paraModalState = { root: null, container: null };
  }
  return window.__paraModalState;
}

export type ParaConnectorModalOptions = {
  queryClient: QueryClient;
  para: ParaWeb;
  appName: string;
  rpcUrl: string;
  chain: Chain;
  walletConnectProjectId: string;
  modalProps: {
    authLayout?: ("AUTH:FULL" | "AUTH:CONDENSED" | "EXTERNAL:FULL" | "EXTERNAL:CONDENSED")[];
    disableEmailLogin?: boolean;
    disablePhoneLogin?: boolean;
    oAuthMethods?: ("GOOGLE" | "APPLE" | "TWITTER" | "DISCORD" | "FACEBOOK" | "FARCASTER" | "TELEGRAM")[];
    recoverySecretStepEnabled?: boolean;
    twoFactorAuthEnabled?: boolean;
    onRampTestMode?: boolean;
  };
};

export function createParaConnectorRenderModal(opts: ParaConnectorModalOptions) {
  return (onCloseFromConnector: () => void) => {
    if (typeof window === "undefined") {
      return { openModal: () => {} };
    }

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const isConnectSettled = async () => {
      const [loggedIn, evmWallets] = await Promise.all([
        opts.para.isFullyLoggedIn(),
        Promise.resolve(opts.para.getWalletsByType("EVM")),
      ]);
      return loggedIn || evmWallets.length > 0;
    };

    const onClose = () => {
      void opts.para
        .isFullyLoggedIn()
        .then(async (loggedIn) => {
          if (loggedIn) return;
          for (let i = 0; i < 60; i++) {
            await wait(500);
            if (await isConnectSettled()) return;
          }
          onCloseFromConnector();
        })
        .catch(() => onCloseFromConnector());
    };

    const chains = [opts.chain] as const;
    const transports = {
      [opts.chain.id]: http(opts.rpcUrl),
    } as Record<(typeof chains)[number]["id"], Transport>;

    const run = async () => {
      const { createRoot } = await import("react-dom/client");

      let container = document.getElementById("para-modal");
      if (!container) {
        container = document.createElement("div");
        container.id = "para-modal";
        document.body.appendChild(container);
      }

      const hasWalletConnect = opts.walletConnectProjectId.trim().length > 0;
      const externalWalletConfig: {
        wallets: TExternalWallet[];
        includeWalletVerification: boolean;
        evmConnector: {
          config: {
            chains: readonly [Chain];
            transports: Record<number, Transport>;
          };
        };
        walletConnect?: { projectId: string };
      } = {
        wallets: (hasWalletConnect ? ["METAMASK", "COINBASE", "RAINBOW"] : ["METAMASK"]) as TExternalWallet[],
        includeWalletVerification: false,
        evmConnector: {
          config: {
            chains,
            transports,
          },
        },
      };
      if (hasWalletConnect) {
        externalWalletConfig.walletConnect = {
          projectId: opts.walletConnectProjectId,
        };
      }

      const tree = (
        <QueryClientProvider client={opts.queryClient}>
          <ParaProvider
            paraClientConfig={opts.para}
            config={{ appName: opts.appName }}
            externalWalletConfig={externalWalletConfig}
            paraModalConfig={{
              ...opts.modalProps,
              onClose,
            }}
          />
        </QueryClientProvider>
      );

      const modalState = getModalState();
      if (!modalState.root || modalState.container !== container) {
        modalState.root = createRoot(container);
        modalState.container = container;
      }
      modalState.root.render(tree);
    };

    void run();
    return { openModal: () => setIsOpen(true) };
  };
}
