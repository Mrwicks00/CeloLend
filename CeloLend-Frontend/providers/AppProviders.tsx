"use client";

import type { ReactNode } from "react";
import { PrivyProviderWrapper } from "./PrivyProviderWrapper";
import { WalletProvider } from "@/contexts/WalletContext";
import { SelfProtocolProvider } from "@/contexts/SelfProtocolContext";
import { ContractProvider } from "@/contexts/ContractContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <PrivyProviderWrapper>
        <WalletProvider>
          <ContractProvider>
            <SelfProtocolProvider>{children}</SelfProtocolProvider>
          </ContractProvider>
        </WalletProvider>
      </PrivyProviderWrapper>
    </ThemeProvider>
  );
}
