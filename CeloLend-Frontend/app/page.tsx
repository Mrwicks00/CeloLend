import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  Phone,
  Wallet,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with organic background */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-[#e54041] to-[#ff4757] opacity-20 blob-shape floating"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-gradient-to-br from-[#ff6f61] to-[#e57373] opacity-30 blob-shape-2 floating-delayed"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              P2P Lending on Celo
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#e54041] to-[#ff4757] animate-gradient">
                With Identity Verification
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Secure peer-to-peer lending with Self Protocol identity
              verification. Support for CELO and Mento stablecoins (cUSD, cEUR,
              cREAL) with dynamic interest rates and smart contract automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/onboarding">
                <Button className="btn-primary px-8 py-3 text-lg animate-gentle-bounce">
                  Start Borrowing
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button className="btn-secondary px-8 py-3 text-lg">
                Become a Lender
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with wave divider */}
      <section className="py-16 bg-gradient-organic-light wave-divider relative">
        <div className="absolute top-10 left-1/4 w-8 h-8 bg-[#e54041] rounded-full floating opacity-60"></div>
        <div className="absolute bottom-20 right-1/3 w-6 h-6 bg-[#ff4757] rounded-full floating-delayed opacity-40"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Choose CeloLend?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience verified P2P lending with multi-token support,
              real-time pricing, and automated repayment tracking
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="card-organic card-hover animate-pulse-glow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#e54041] to-[#ff4757] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Identity Verified
                </h3>
                <p className="text-muted-foreground">
                  Self Protocol verification ensures trusted lending
                </p>
              </CardContent>
            </Card>

            <Card className="card-organic card-hover">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#ff4757] to-[#ff6f61] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Multi-Token Support
                </h3>
                <p className="text-muted-foreground">
                  CELO, cUSD, cEUR, cREAL - powered by Mento Protocol
                </p>
              </CardContent>
            </Card>

            <Card className="card-organic card-hover">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#ff6f61] to-[#e57373] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Automated Repayment
                </h3>
                <p className="text-muted-foreground">
                  Smart contract automation with flexible payment options
                </p>
              </CardContent>
            </Card>

            <Card className="card-organic card-hover">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#e57373] to-[#8b1e3f] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Dynamic Rates
                </h3>
                <p className="text-muted-foreground">
                  Real-time pricing with collateral-based discounts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#e54041] to-[#ff4757] opacity-10 blob-shape"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple steps to get your loan or start lending
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#e54041] to-[#ff4757] rounded-full flex items-center justify-center mx-auto mb-4 animate-gentle-bounce">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Connect & Verify
              </h3>
              <p className="text-muted-foreground">
                Connect your wallet or verify via phone number
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 bg-gradient-to-br from-[#ff4757] to-[#ff6f61] rounded-full flex items-center justify-center mx-auto mb-4 animate-gentle-bounce"
                style={{ animationDelay: "0.5s" }}
              >
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Deposit Collateral
              </h3>
              <p className="text-muted-foreground">
                Secure your loan with digital or tokenized assets
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 bg-gradient-to-br from-[#ff6f61] to-[#e57373] rounded-full flex items-center justify-center mx-auto mb-4 animate-gentle-bounce"
                style={{ animationDelay: "1s" }}
              >
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Get Funded
              </h3>
              <p className="text-muted-foreground">
                Receive your loan instantly to your wallet
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with organic gradient */}
      <section className="py-16 bg-gradient-organic relative overflow-hidden">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-20 blob-shape floating"></div>
        <div className="absolute bottom-10 right-10 w-16 h-16 bg-white opacity-30 blob-shape-2 floating-delayed"></div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of users already using DeFi Lend for their financial
            needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button className="bg-white text-[#e54041] hover:bg-gray-100 hover:scale-105 transition-all duration-300 px-8 py-3 text-lg font-semibold rounded-2xl">
                <Wallet className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </Link>
            <Button className="border-white text-white hover:bg-white hover:text-[#e54041] hover:scale-105 transition-all duration-300 px-8 py-3 text-lg bg-transparent rounded-2xl border-2">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#e54041] to-[#ff4757] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CL</span>
                </div>
                <span className="font-bold text-xl">CeloLend</span>
              </div>
              <p className="text-gray-400">
                Democratizing access to financial services through blockchain
                technology.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/marketplace"
                    className="hover:text-white transition-colors"
                  >
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/collateral"
                    className="hover:text-white transition-colors"
                  >
                    Collateral
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/help"
                    className="hover:text-white transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="hover:text-white transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 CeloLend. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
