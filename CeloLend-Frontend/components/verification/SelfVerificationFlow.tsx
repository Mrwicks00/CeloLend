"use client";

import React, { useState, useEffect } from "react";
import { getUniversalLink } from "@selfxyz/core";
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  type SelfApp,
} from "@selfxyz/qrcode";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, QrCode, Smartphone, Check, Loader2 } from "lucide-react";
import {
  getSelfProtocolConfig,
  getContractAddress,
} from "@/lib/contracts/addresses";

interface SelfVerificationFlowProps {
  onSuccess: () => void;
  onError: (error: { error_code?: string; reason?: string }) => void;
  userId?: string;
}

export function SelfVerificationFlow({
  onSuccess,
  onError,
  userId = ethers.ZeroAddress,
}: SelfVerificationFlowProps) {
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "scanning" | "verifying" | "success" | "error"
  >("idle");

  useEffect(() => {
    try {
      // Get Self Protocol configuration for Alfajores
      const config = getSelfProtocolConfig(44787); // Alfajores testnet
      const celoLendAddress = getContractAddress("CeloLend", 44787);

      const app = new SelfAppBuilder({
        version: 2,
        appName: "CeloLend",
        scope: "celolend", // Scope seed for frontend QR code
        endpoint: celoLendAddress, // Use your CeloLend contract address as endpoint
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png", // You can replace with your logo
        userId: userId,
        endpointType: "staging_celo", // For Celo testnet contract integration
        userIdType: "hex",
        userDefinedData: "CeloLend Identity Verification",
        disclosures: {
          // Verification requirements (must match backend)
          minimumAge: 18,
          ofac: false,
          excludedCountries: [],

          // Disclosure requests (what users reveal)
          nationality: true,
          gender: true,
          // Other optional fields:
          // name: false,
          // date_of_birth: true,
          // passport_number: false,
          // expiry_date: false,
        },
      }).build();

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to initialize Self app:", error);
      setIsLoading(false);
      onError({ reason: "Failed to initialize verification" });
    }
  }, [userId, onError]);

  const handleSuccess = () => {
    setVerificationStatus("success");
    console.log("Self Protocol verification successful!");
    onSuccess();
  };

  const handleError = (error: { error_code?: string; reason?: string }) => {
    setVerificationStatus("error");
    console.error("Self Protocol verification failed:", error);
    onError(error);
  };

  const openSelfApp = () => {
    if (universalLink) {
      window.open(universalLink, "_blank");
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#B03060]" />
          <p className="text-gray-600">Initializing verification...</p>
        </CardContent>
      </Card>
    );
  }

  if (!selfApp) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Shield className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600">Failed to initialize verification</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* QR Code Section */}
      <Card className="max-w-md mx-auto bg-white border-2 border-gray-200">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6F61] to-[#E57373] rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl text-gray-900">Scan QR Code</CardTitle>
          <p className="text-gray-600">
            Scan this QR code with the Self app to verify your identity
          </p>
        </CardHeader>
        <CardContent className="text-center bg-white p-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <SelfQRcodeWrapper
              selfApp={selfApp}
              onSuccess={handleSuccess}
              onError={handleError}
              size={250}
              darkMode={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Universal Link Section */}
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-lg">Mobile Alternative</CardTitle>
          <p className="text-gray-600">
            Open Self app directly on your mobile device
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            onClick={openSelfApp}
            className="btn-primary text-white w-full"
            disabled={!universalLink}
          >
            Open Self App
          </Button>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      {verificationStatus === "scanning" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-blue-900 font-semibold">Scanning QR Code...</p>
          <p className="text-blue-800 text-sm">
            Please scan the QR code with your Self app
          </p>
        </div>
      )}

      {verificationStatus === "verifying" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <Loader2 className="w-5 h-5 text-yellow-600 animate-spin mx-auto mb-2" />
          <p className="text-yellow-900 font-semibold">Verifying Identity...</p>
          <p className="text-yellow-800 text-sm">
            Please complete the verification in the Self app
          </p>
        </div>
      )}

      {verificationStatus === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <Check className="w-5 h-5 text-green-600 mx-auto mb-2" />
          <p className="text-green-900 font-semibold">Identity Verified!</p>
          <p className="text-green-800 text-sm">
            Your identity has been successfully verified
          </p>
        </div>
      )}

      {verificationStatus === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <Shield className="w-5 h-5 text-red-600 mx-auto mb-2" />
          <p className="text-red-900 font-semibold">Verification Failed</p>
          <p className="text-red-800 text-sm">
            Please try again or contact support
          </p>
        </div>
      )}

      {/* Instructions */}
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">How to Verify</CardTitle>
          <p className="text-sm text-gray-600">
            For testing on Alfajores, use{" "}
            <a
              href="https://playground.staging.self.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              staging playground
            </a>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-[#B03060] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-semibold">Download Self App</p>
              <p className="text-sm text-gray-600">
                Get the Self app from your device's app store
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 For testing: Tap 5 times on the Self card to create a mock
                passport
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-[#B03060] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-semibold">Scan QR Code</p>
              <p className="text-sm text-gray-600">
                Use the Self app to scan the QR code above
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-[#B03060] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="font-semibold">Complete Verification</p>
              <p className="text-sm text-gray-600">
                Follow the prompts in the Self app to verify your identity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
