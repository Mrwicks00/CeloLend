"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { celo, celoAlfajores } from "viem/chains";
import type { ReactNode } from "react";

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is required");
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Appearance customization
        appearance: {
          theme: "light",
          accentColor: "#10B981", // Emerald color for Celo
          logo: "/placeholder-logo.svg",
          showWalletLoginFirst: false,
        },

        // Supported chains - Celo ecosystem
        supportedChains: [celoAlfajores, celo],

        // Default to Alfajores for development
        defaultChain: celoAlfajores,

        // Embedded wallet configuration
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          requireUserPasswordOnCreate: false,
        },

        // Login methods
        loginMethods: ["email", "google", "twitter", "discord", "wallet"],

        // Wallet connection options
        walletConnectCloudProjectId:
          process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,

        // Funding methods for embedded wallets
        fundingMethodConfig: {
          moonpay: {
            useSandbox: true, // Set to false for production
          },
        },

        // Legal links
        legal: {
          termsAndConditionsUrl: "/terms",
          privacyPolicyUrl: "/privacy",
        },

        // Remove customAuth for now - not needed
      }}
    >
      {children}
    </PrivyProvider>
  );
}
