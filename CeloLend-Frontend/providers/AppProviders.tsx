"use client";

import type { ReactNode } from "react";
import { PrivyProviderWrapper } from "./PrivyProviderWrapper";
import { WalletProvider } from "@/contexts/WalletContext";
import { SelfProtocolProvider } from "@/contexts/SelfProtocolContext";
import { ThemeProvider } from "@/components/theme-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <PrivyProviderWrapper>
        <WalletProvider>
          <SelfProtocolProvider>{children}</SelfProtocolProvider>
        </WalletProvider>
      </PrivyProviderWrapper>
    </ThemeProvider>
  );
}
