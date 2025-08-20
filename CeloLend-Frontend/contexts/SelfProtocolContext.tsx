"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useWallet } from "./WalletContext";
import { useContract } from "./ContractContext";
import { getSelfProtocolConfig } from "@/lib/contracts/addresses";

interface SelfProtocolState {
  isVerified: boolean;
  userIdentifier: string | null;
  verificationStatus: "unverified" | "pending" | "verified";
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
  const { address, chainId, isWrongNetwork } = useWallet();
  const { celoLend } = useContract();
  const [state, setState] = useState<SelfProtocolState>({
    isVerified: false,
    userIdentifier: null,
    verificationStatus: "unverified",
    isVerifying: false,
  });


  const checkVerificationStatus = useCallback(async () => {
    if (!address || !celoLend) {
      return;
    }
  
    try {
      console.log("Checking verification for address:", address);
      
      const isVerified = await celoLend.isUserVerified(address);
      const userIdentifier = await celoLend.getUserIdentifier(address);
  
      console.log("Contract response:", { isVerified, userIdentifier });
  
      const hasValidIdentifier = userIdentifier && 
        userIdentifier !== "0x0000000000000000000000000000000000000000000000000000000000000000";
  
      setState((prev) => ({
        ...prev,
        isVerified: isVerified && hasValidIdentifier,
        userIdentifier: hasValidIdentifier ? userIdentifier : null,
        verificationStatus: (isVerified && hasValidIdentifier) ? "verified" : "unverified",
        isVerifying: false,
      }));
    } catch (error) {
      console.error("Error checking verification status:", error);
      setState((prev) => ({ 
        ...prev, 
        isVerifying: false,
        verificationStatus: "unverified",
      }));
    }
  }, [address, celoLend]);

  // Check if user is verified on contract
  // const checkVerificationStatus = useCallback(async () => {
  //   if (!address || !celoLend) {
  //     console.log(
  //       "checkVerificationStatus: Missing address or celoLend contract",
  //       { address, celoLend: !!celoLend }
  //     );
  //     return;
  //   }

  //   try {
  //     console.log(
  //       "checkVerificationStatus: Checking verification for address:",
  //       address
  //     );
  //     setState((prev) => ({ ...prev, isVerifying: true }));

  //     // Call contract to check if user is verified
  //     const isVerified = await celoLend.isUserVerified(address);
  //     const userIdentifier = await celoLend.getUserIdentifier(address);

  //     console.log("checkVerificationStatus: Contract response:", {
  //       isVerified,
  //       userIdentifier,
  //     });

  //     setState((prev) => ({
  //       ...prev,
  //       isVerified,
  //       userIdentifier:
  //         userIdentifier !==
  //         "0x0000000000000000000000000000000000000000000000000000000000000000"
  //           ? userIdentifier
  //           : null,
  //       verificationStatus: isVerified ? "verified" : "unverified",
  //       isVerifying: false,
  //     }));
  //   } catch (error) {
  //     console.error("Error checking verification status:", error);
  //     setState((prev) => ({ ...prev, isVerifying: false }));
  //   }
  // }, [address, celoLend]);

  // Start verification process
  const startVerification = useCallback(() => {
    if (!address) {
      console.error("No wallet address available");
      return;
    }

    if (isWrongNetwork) {
      // prompt user to switch; don’t start on the wrong chain
      return;
    }

    setState((prev) => ({
      ...prev,
      verificationStatus: "pending",
      isVerifying: true,
    }));

    // Get Self Protocol configuration for current network
    const config = getSelfProtocolConfig(chainId || 44787);

    console.log("Starting Self Protocol verification with config:", config);

    // The actual verification will be handled by the SelfVerificationFlow component
    // This context just manages the state
  }, [address, chainId]);

  // Reset verification state
  const resetVerification = useCallback(() => {
    setState({
      isVerified: false,
      userIdentifier: null,
      verificationStatus: "unverified",
      isVerifying: false,
    });
  }, []);

  // Handle verification success from Self Protocol
  // Replace your handleVerificationSuccess with this simple approach
  const handleVerificationSuccess = useCallback(() => {
    setState(prev => ({ ...prev, verificationStatus: "verified", isVerified: true, isVerifying: false }));
  
    let attempts = 0;
    const maxAttempts = 15; // ~30s at 2s interval
    const interval = setInterval(async () => {
      attempts++;
      await checkVerificationStatus();
      setState(prev => {
        if (prev.isVerified) {
          clearInterval(interval);
        }
        return prev;
      });
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 2000);
  }, [checkVerificationStatus]);
  

// Simplify checkVerificationStatus
// const checkVerificationStatus = useCallback(async () => {
//   if (!address || !celoLend) {
//     return;
//   }

//   try {
//     console.log("Checking verification for address:", address);
    
//     const isVerified = await celoLend.isUserVerified(address);
//     const userIdentifier = await celoLend.getUserIdentifier(address);

//     console.log("Contract response:", { isVerified, userIdentifier });

//     const hasValidIdentifier = userIdentifier && 
//       userIdentifier !== "0x0000000000000000000000000000000000000000000000000000000000000000";

//     setState((prev) => ({
//       ...prev,
//       isVerified: isVerified && hasValidIdentifier,
//       userIdentifier: hasValidIdentifier ? userIdentifier : null,
//       verificationStatus: (isVerified && hasValidIdentifier) ? "verified" : "unverified",
//       isVerifying: false,
//     }));
//   } catch (error) {
//     console.error("Error checking verification status:", error);
//     setState((prev) => ({ 
//       ...prev, 
//       isVerifying: false,
//       verificationStatus: "unverified",
//     }));
//   }
// }, [address, celoLend]);

  // Check verification status when address or contract changes
  useEffect(() => {
    if (address && celoLend) {
      checkVerificationStatus();
    } else if (!address) {
      resetVerification();
    }
  }, [address, celoLend, checkVerificationStatus, resetVerification]);

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
    throw new Error(
      "useSelfProtocol must be used within a SelfProtocolProvider"
    );
  }
  return context;
}
