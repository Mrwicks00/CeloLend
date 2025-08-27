"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Wallet, ChevronDown, LogOut } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Image from "next/image";

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
        <Button
          onClick={login}
          className="bg-yellow-gradient text-black px-8 py-3 rounded-2xl font-iphone-bold transition-all duration-300 hover:-translate-y-1 hover:scale-105"
        >
          <Wallet className="w-5 h-5 mr-2" />
          Connect Wallet
        </Button>
      );
    }

    return (
      <div className="relative" ref={walletMenuRef}>
        <Button
          onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
          className={`bg-yellow-gradient text-black px-8 py-3 rounded-2xl font-iphone-bold transition-all duration-300 hover:-translate-y-1 hover:scale-105 ${
            isWrongNetwork ? "bg-yellow-600 hover:bg-yellow-700" : ""
          }`}
        >
          <Wallet className="w-5 h-5 mr-2" />
          {isWrongNetwork ? "Wrong Network" : formatAddress(address)}
          <ChevronDown className="w-5 h-5 ml-2" />
        </Button>

        {isWalletMenuOpen && (
          <div className="absolute right-0 mt-3 w-72 bg-card/95 backdrop-blur-md rounded-2xl border border-border z-50">
            <div className="p-6 border-b border-border">
              <div className="text-sm font-iphone text-gray-600 mb-1">
                Wallet Address
              </div>
              <div className="font-mono text-sm font-iphone-bold text-gray-900 mb-4">
                {formatAddress(address)}
              </div>
              <div className="text-sm font-iphone text-gray-600 mb-1">
                Balance
              </div>
              <div className="text-lg font-iphone-black text-gray-700">
                {formatBalance(balance)} CELO
              </div>
              {isWrongNetwork && (
                <div className="mt-4">
                  <Button
                    onClick={switchToAlfajores}
                    size="sm"
                    className="w-full bg-yellow-600 hover:bg-yellow-700 rounded-xl font-iphone-bold"
                  >
                    Switch to Alfajores
                  </Button>
                </div>
              )}
            </div>
            <div className="p-4">
              <Button
                onClick={() => {
                  logout();
                  setIsWalletMenuOpen(false);
                }}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-xl font-iphone"
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-yellow-gradient">
              <Image
                src="/CeloLend.png"
                alt="CeloLend"
                width={48}
                height={48}
                className="w-full h-full object-contain p-2"
                priority
              />
            </div>
            <span className="font-iphone-black text-2xl text-foreground">
              CeloLend
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/marketplace"
              className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg"
            >
              Marketplace
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg"
            >
              Dashboard
            </Link>
            <Link
              href="/help"
              className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg"
            >
              Help
            </Link>
            {!isVerified && (
              <Link
                href="/onboarding"
                className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg"
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
          <div className="md:hidden py-6 border-t border-border bg-background backdrop-blur-md">
            <div className="flex flex-col space-y-6">
              <Link
                key="marketplace"
                href="/marketplace"
                className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg py-2"
              >
                Marketplace
              </Link>
              <Link
                key="dashboard"
                href="/dashboard"
                className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg py-2"
              >
                Dashboard
              </Link>
              <Link
                key="help"
                href="/help"
                className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg py-2"
              >
                Help
              </Link>
              {!isVerified && (
                <Link
                  key="onboarding"
                  href="/onboarding"
                  className="text-muted-foreground hover:text-gray-600 transition-colors font-iphone text-lg py-2"
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
