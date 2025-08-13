"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Wallet } from "lucide-react"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CL</span>
            </div>
            <span className="font-bold text-xl text-gray-900">CeloLend</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/marketplace" className="text-gray-600 hover:text-[#B03060] transition-colors">
              Marketplace
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-[#B03060] transition-colors">
              Dashboard
            </Link>
            <Link href="/help" className="text-gray-600 hover:text-[#B03060] transition-colors">
              Help
            </Link>
            <Link href="/onboarding" className="text-gray-600 hover:text-[#B03060] transition-colors">
              Get Started
            </Link>
            <Button className="btn-primary text-white px-6">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-4">
              <Link href="/marketplace" className="text-gray-600 hover:text-[#B03060] transition-colors">
                Marketplace
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-[#B03060] transition-colors">
                Dashboard
              </Link>
              <Link href="/help" className="text-gray-600 hover:text-[#B03060] transition-colors">
                Help
              </Link>
              <Link href="/onboarding" className="text-gray-600 hover:text-[#B03060] transition-colors">
                Get Started
              </Link>
              <Button className="btn-primary text-white w-full">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
