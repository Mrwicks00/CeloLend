"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Wallet, ChevronDown, LogOut } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const {
    isAuthenticated,
    address,
    balance,
    chainId,
    isWrongNetwork,
    login,
    logout,
    switchToAlfajores,
  } = useWallet();

  const { isVerified } = useSelfProtocol();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string) => {
    return parseFloat(bal).toFixed(4);
  };

  // Close wallet menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        walletMenuRef.current &&
        !walletMenuRef.current.contains(event.target as Node)
      ) {
        setIsWalletMenuOpen(false);
      }
    }

    if (isWalletMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isWalletMenuOpen]);

  const WalletButton = () => {
    if (!isAuthenticated || !address) {
      return (
        <Button onClick={login} className="btn-primary text-white px-6">
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      );
    }

    return (
      <div className="relative" ref={walletMenuRef}>
        <Button
          onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
          className={`btn-primary text-white px-6 ${
            isWrongNetwork ? "bg-red-600 hover:bg-red-700" : ""
          }`}
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isWrongNetwork ? "Wrong Network" : formatAddress(address)}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>

        {isWalletMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-100">
              <div className="text-sm text-gray-600">Wallet Address</div>
              <div className="font-mono text-sm text-gray-900">
                {formatAddress(address)}
              </div>
              <div className="text-sm text-gray-600 mt-2">Balance</div>
              <div className="font-semibold text-gray-900">
                {formatBalance(balance)} CELO
              </div>
              {isWrongNetwork && (
                <div className="mt-2">
                  <Button
                    onClick={switchToAlfajores}
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Switch to Alfajores
                  </Button>
                </div>
              )}
            </div>
            <div className="p-2">
              <Button
                onClick={() => {
                  logout();
                  setIsWalletMenuOpen(false);
                }}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CL</span>
            </div>
            <span className="font-bold text-xl text-foreground">CeloLend</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/marketplace"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Marketplace
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/help"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Help
            </Link>
            {!isVerified && (
              <Link
                href="/onboarding"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Get Started
              </Link>
            )}
            <ThemeToggle />
            <WalletButton />
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-4">
              <Link
                key="marketplace"
                href="/marketplace"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Marketplace
              </Link>
              <Link
                key="dashboard"
                href="/dashboard"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
              <Link
                key="help"
                href="/help"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Help
              </Link>
              {!isVerified && (
                <Link
                  key="onboarding"
                  href="/onboarding"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Get Started
                </Link>
              )}
              <div key="wallet-button">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
