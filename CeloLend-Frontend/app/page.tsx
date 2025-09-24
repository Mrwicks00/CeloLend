import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
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

      {/* Hero Banner Section */}
      <section className="relative h-[80vh] min-h-[500px] flex items-center justify-center overflow-hidden bg-yellow-top-white-bottom">
        {/* Background Banner Image */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/bannerCelo.png"
            alt="CeloLend Banner"
            fill
            className="object-cover"
            priority
          />
          {/* Yellow overlay for better text readability */}
          <div className="absolute inset-0 bg-yellow-400/20 backdrop-blur-[2px]"></div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 right-10 w-32 h-32 bg-yellow-gradient rounded-full opacity-60 animate-bounce"></div>
        <div
          className="absolute bottom-20 left-10 w-24 h-24 bg-yellow-gradient-dark rounded-full opacity-60 animate-bounce"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/4 w-16 h-16 bg-yellow-400 rounded-full opacity-60 animate-bounce"
          style={{ animationDelay: "2s" }}
        ></div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Subtitle with enhanced styling */}
          <div className="mb-16">
            <div className="bg-card/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto shadow-2xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-foreground font-iphone-black mb-6 max-w-4xl mx-auto leading-tight">
                Secure peer-to-peer lending with identity-gated access
              </h2>
              <p className="text-lg sm:text-xl lg:text-2xl text-foreground font-iphone-bold max-w-3xl mx-auto leading-relaxed">
                Support for CELO and Mento stablecoins with dynamic interest
                rates and smart contract automation
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <Link href="/onboarding">
              <Button className="bg-yellow-gradient text-black px-8 sm:px-10 py-3 sm:py-4 text-lg sm:text-xl font-iphone-black rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 animate-bounce w-full sm:w-auto">
                Start Borrowing
                <ArrowRight className="w-5 sm:w-6 h-5 sm:h-6 ml-2 sm:ml-3" />
              </Button>
            </Link>
            <Button className="bg-white/90 backdrop-blur-sm hover:bg-white text-black px-8 sm:px-10 py-3 sm:text-xl font-iphone-black rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 w-full sm:w-auto">
              Become a Lender
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
            <div className="bg-card rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gray-50">
                <Image
                  src="/secure-access.png"
                  alt="Secure Access"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-foreground font-iphone-bold text-base sm:text-lg mb-2">
                Secure Access
              </h3>
              <p className="text-foreground text-xs sm:text-sm leading-relaxed font-iphone">
                Identity-gated lending platform
              </p>
            </div>

            <div className="bg-card rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gray-50">
                <Image
                  src="/mutli-token.jpg"
                  alt="Multi-Token Support"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-foreground font-iphone-bold text-base sm:text-lg mb-2">
                Multi-Token
              </h3>
              <p className="text-foreground text-xs sm:text-sm leading-relaxed font-iphone">
                CELO, cUSD, cEUR, cREAL support
              </p>
            </div>

            <div className="bg-card rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gray-50">
                <Image
                  src="/dynamic-pricing.avif"
                  alt="Dynamic Pricing"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-foreground font-iphone-bold text-base sm:text-lg mb-2">
                Dynamic Rates
              </h3>
              <p className="text-black text-xs sm:text-sm leading-relaxed font-iphone">
                Real-time pricing & automation
              </p>
            </div>

            <div className="bg-card rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gray-50">
                <Image
                  src="/self-protocol.jpg"
                  alt="Self Protocol"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-foreground font-iphone-bold text-base sm:text-lg mb-2">
                Self Protocol
              </h3>
              <p className="text-foreground text-xs sm:text-sm leading-relaxed font-iphone">
                Privacy-preserving verification
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      </section>

      {/* Features Section with yellow top */}
      <section className="py-16 bg-yellow-top-white-bottom relative">
        <div className="absolute top-10 left-1/4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce opacity-60"></div>
        <div
          className="absolute bottom-20 right-1/3 w-6 h-6 bg-yellow-500 rounded-full animate-bounce opacity-40"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-iphone-black text-foreground mb-4">
              Why Choose CeloLend?
            </h2>
            <p className="text-lg font-iphone text-foreground max-w-2xl mx-auto">
              Experience verified P2P lending with multi-token support,
              real-time pricing, and automated repayment tracking
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-card rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-xl font-iphone-bold text-foreground mb-2">
                  Identity Verified
                </h3>
                <p className="text-foreground font-iphone">
                  Self Protocol verification ensures trusted lending
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-gradient-dark rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-xl font-iphone-bold text-foreground mb-2">
                  Multi-Token Support
                </h3>
                <p className="text-foreground font-iphone">
                  CELO, cUSD, cEUR, cREAL - powered by Mento Protocol
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-xl font-iphone-bold text-foreground mb-2">
                  Automated Repayment
                </h3>
                <p className="text-foreground font-iphone">
                  Smart contract automation with flexible payment options
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-gradient-dark rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-xl font-iphone-bold text-foreground mb-2">
                  Dynamic Rates
                </h3>
                <p className="text-foreground font-iphone">
                  Real-time pricing with collateral-based discounts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-yellow-top-white-bottom relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 opacity-20 rounded-full"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-iphone-black text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg font-iphone text-foreground max-w-2xl mx-auto">
              Simple steps to get your loan or start lending
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <span className="text-foreground font-iphone-black text-xl">
                  1
                </span>
              </div>
              <h3 className="text-xl font-iphone-bold text-foreground mb-2">
                Connect & Verify
              </h3>
              <p className="text-foreground font-iphone">
                Connect your wallet or verify via phone number
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 bg-yellow-gradient-dark rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"
                style={{ animationDelay: "0.5s" }}
              >
                <span className="text-foreground font-iphone-black text-xl">
                  2
                </span>
              </div>
              <h3 className="text-xl font-iphone-bold text-foreground mb-2">
                Deposit Collateral
              </h3>
              <p className="text-foreground font-iphone">
                Secure your loan with digital or tokenized assets
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 bg-yellow-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"
                style={{ animationDelay: "1s" }}
              >
                <span className="text-foreground font-iphone-black text-xl">
                  3
                </span>
              </div>
              <h3 className="text-xl font-iphone-bold text-foreground mb-2">
                Get Funded
              </h3>
              <p className="text-foreground font-iphone">
                Receive your loan instantly to your wallet
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with yellow theme */}
      <section className="py-16 bg-yellow-gradient relative overflow-hidden">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-20 rounded-full animate-bounce"></div>
        <div
          className="absolute bottom-10 right-10 w-16 h-16 bg-white opacity-30 rounded-full animate-bounce"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl font-iphone-black text-black mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl font-iphone text-black mb-8">
            Join thousands of users already using CeloLend for their financial
            needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button className="bg-white text-black hover:bg-gray-100 hover:scale-105 transition-all duration-300 px-8 py-3 text-lg font-iphone-bold rounded-2xl">
                <Wallet className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </Link>
            <Button className="border-gray-800 text-black hover:bg-white hover:text-black hover:scale-105 transition-all duration-300 px-8 py-3 text-lg bg-transparent rounded-2xl border-2">
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
