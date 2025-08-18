"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useWallet } from "./WalletContext";
import { getSelfProtocolConfig } from "@/lib/contracts/addresses";

interface SelfProtocolState {
  isVerified: boolean;
  userIdentifier: string | null;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  isVerifying: boolean;
}

interface SelfProtocolActions {
  startVerification: () => void;
  checkVerificationStatus: () => Promise<void>;
  resetVerification: () => void;
  handleVerificationSuccess: () => void;
}

type SelfProtocolContextType = SelfProtocolState & SelfProtocolActions;

const SelfProtocolContext = createContext<SelfProtocolContextType | null>(null);

interface SelfProtocolProviderProps {
  children: React.ReactNode;
}

export function SelfProtocolProvider({ children }: SelfProtocolProviderProps) {
  const { address, chainId } = useWallet();
  const [state, setState] = useState<SelfProtocolState>({
    isVerified: false,
    userIdentifier: null,
    verificationStatus: 'unverified',
    isVerifying: false,
  });

  // Check if user is verified on contract
  const checkVerificationStatus = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({ ...prev, isVerifying: true }));
      
      // TODO: Call contract to check if user is verified
      // const celoLendContract = getCeloLendContract();
      // const isVerified = await celoLendContract.isUserVerified(address);
      // const userIdentifier = await celoLendContract.getUserIdentifier(address);
      
      // For now, simulate verification check
      const isVerified = false; // This will be replaced with actual contract call
      const userIdentifier = null;
      
      setState(prev => ({
        ...prev,
        isVerified,
        userIdentifier,
        verificationStatus: isVerified ? 'verified' : 'unverified',
        isVerifying: false,
      }));
    } catch (error) {
      console.error('Error checking verification status:', error);
      setState(prev => ({ ...prev, isVerifying: false }));
    }
  }, [address]);

  // Start verification process
  const startVerification = useCallback(() => {
    if (!address) {
      console.error('No wallet address available');
      return;
    }

    setState(prev => ({ 
      ...prev, 
      verificationStatus: 'pending',
      isVerifying: true 
    }));

    // Get Self Protocol configuration for current network
    const config = getSelfProtocolConfig(chainId || 44787);
    
    console.log('Starting Self Protocol verification with config:', config);
    
    // The actual verification will be handled by the SelfVerificationFlow component
    // This context just manages the state
  }, [address, chainId]);

  // Reset verification state
  const resetVerification = useCallback(() => {
    setState({
      isVerified: false,
      userIdentifier: null,
      verificationStatus: 'unverified',
      isVerifying: false,
    });
  }, []);

  // Handle verification success from Self Protocol
  const handleVerificationSuccess = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      verificationStatus: 'verified',
      isVerified: true,
      isVerifying: false,
      userIdentifier: address || 'unknown'
    }));
  }, [address]);

  // Check verification status when address changes
  useEffect(() => {
    if (address) {
      checkVerificationStatus();
    } else {
      resetVerification();
    }
  }, [address, checkVerificationStatus, resetVerification]);

  const contextValue: SelfProtocolContextType = {
    ...state,
    startVerification,
    checkVerificationStatus,
    resetVerification,
    handleVerificationSuccess,
  };

  return (
    <SelfProtocolContext.Provider value={contextValue}>
      {children}
    </SelfProtocolContext.Provider>
  );
}

// Hook to use Self Protocol context
export function useSelfProtocol() {
  const context = useContext(SelfProtocolContext);
  if (!context) {
    throw new Error("useSelfProtocol must be used within a SelfProtocolProvider");
  }
  return context;
}
