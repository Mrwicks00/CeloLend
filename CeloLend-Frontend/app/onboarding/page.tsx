"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight, Phone, Wallet, Shield, CheckCircle } from "lucide-react"

type OnboardingStep =
  | "welcome"
  | "verification-method"
  | "phone-verification"
  | "wallet-connection"
  | "identity-verification"
  | "proxy-setup"
  | "complete"

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<"phone" | "wallet" | null>(null)

  const handleSendCode = () => {
    // Simulate sending SMS code
    setIsCodeSent(true)
  }

  const handleVerifyCode = () => {
    // Simulate code verification
    if (verificationCode.length === 6) {
      setCurrentStep("identity-verification")
    }
  }

  const handleWalletConnect = () => {
    // Simulate wallet connection
    setCurrentStep("identity-verification")
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "welcome":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Welcome to DeFi Lend</CardTitle>
              <p className="text-gray-600">Let's get you set up with secure access to decentralized lending</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-[#B03060]" />
                  <span className="text-sm">Secure identity verification</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-[#B03060]" />
                  <span className="text-sm">Instant loan access</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-[#B03060]" />
                  <span className="text-sm">Mobile-friendly experience</span>
                </div>
              </div>
              <Button className="btn-primary text-white w-full" onClick={() => setCurrentStep("verification-method")}>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )

      case "verification-method":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Choose Verification Method</CardTitle>
              <p className="text-gray-600">How would you like to verify your identity?</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full p-6 h-auto border-2 hover:border-[#B03060] hover:bg-[#B03060]/5 bg-transparent"
                onClick={() => {
                  setVerificationMethod("phone")
                  setCurrentStep("phone-verification")
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Phone Number</div>
                    <div className="text-sm text-gray-600">Verify via SMS or USSD</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full p-6 h-auto border-2 hover:border-[#B03060] hover:bg-[#B03060]/5 bg-transparent"
                onClick={() => {
                  setVerificationMethod("wallet")
                  setCurrentStep("wallet-connection")
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#C85062] to-[#FF6F61] rounded-lg flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Crypto Wallet</div>
                    <div className="text-sm text-gray-600">Connect your existing wallet</div>
                  </div>
                </div>
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => setCurrentStep("welcome")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        )

      case "phone-verification":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Phone Verification</CardTitle>
              <p className="text-gray-600">
                {!isCodeSent
                  ? "Enter your phone number to receive a verification code"
                  : "Enter the 6-digit code sent to your phone"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCodeSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <Button
                    className="btn-primary text-white w-full"
                    onClick={handleSendCode}
                    disabled={phoneNumber.length < 10}
                  >
                    Send Verification Code
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                  </div>
                  <Button
                    className="btn-primary text-white w-full"
                    onClick={handleVerifyCode}
                    disabled={verificationCode.length !== 6}
                  >
                    Verify Code
                  </Button>
                  <Button variant="ghost" className="w-full text-[#B03060]" onClick={() => setIsCodeSent(false)}>
                    Resend Code
                  </Button>
                </>
              )}
              <Button variant="ghost" className="w-full" onClick={() => setCurrentStep("verification-method")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        )

      case "wallet-connection":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#C85062] to-[#FF6F61] rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Connect Wallet</CardTitle>
              <p className="text-gray-600">Choose your preferred wallet to connect</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full p-4 border-2 hover:border-[#B03060] hover:bg-[#B03060]/5 bg-transparent"
                onClick={handleWalletConnect}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg"></div>
                  <span className="font-semibold">MetaMask</span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full p-4 border-2 hover:border-[#B03060] hover:bg-[#B03060]/5 bg-transparent"
                onClick={handleWalletConnect}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
                  <span className="font-semibold">WalletConnect</span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full p-4 border-2 hover:border-[#B03060] hover:bg-[#B03060]/5 bg-transparent"
                onClick={handleWalletConnect}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg"></div>
                  <span className="font-semibold">Phantom</span>
                </div>
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => setCurrentStep("verification-method")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        )

      case "identity-verification":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6F61] to-[#E57373] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Self Protocol Identity</CardTitle>
              <p className="text-gray-600">Complete your identity verification for enhanced security</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">What is Self Protocol?</h4>
                <p className="text-sm text-blue-800">
                  Self Protocol provides decentralized identity verification, ensuring your personal data remains secure
                  and private while meeting compliance requirements.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the Self Protocol identity verification and privacy terms
                  </Label>
                </div>
              </div>

              <Button
                className="btn-primary text-white w-full"
                onClick={() => setCurrentStep("proxy-setup")}
                disabled={!agreedToTerms}
              >
                Continue with Self Protocol
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() =>
                  setCurrentStep(verificationMethod === "phone" ? "phone-verification" : "wallet-connection")
                }
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        )

      case "proxy-setup":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#E57373] to-[#8B1E3F] rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Proxy Wallet Setup</CardTitle>
              <p className="text-gray-600">We'll create a secure proxy wallet for your transactions</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Proxy Wallet Benefits</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Enhanced security for your main wallet</li>
                    <li>• Simplified transaction management</li>
                    <li>• Gas optimization for frequent operations</li>
                    <li>• Easy recovery options</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">Important</h4>
                  <p className="text-sm text-yellow-800">
                    Your proxy wallet will be automatically configured. You can always access your funds through your
                    main wallet.
                  </p>
                </div>
              </div>

              <Button className="btn-primary text-white w-full" onClick={() => setCurrentStep("complete")}>
                Create Proxy Wallet
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => setCurrentStep("identity-verification")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        )

      case "complete":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Welcome to DeFi Lend!</CardTitle>
              <p className="text-gray-600">Your account is now set up and ready to use</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Account Setup Complete</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>✓ Identity verified</li>
                  <li>✓ Proxy wallet created</li>
                  <li>✓ Ready for lending and borrowing</li>
                </ul>
              </div>

              <Button className="btn-primary text-white w-full" onClick={() => (window.location.href = "/dashboard")}>
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                variant="outline"
                className="w-full border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                onClick={() => (window.location.href = "/marketplace")}
              >
                Explore Marketplace
              </Button>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              {[
                "welcome",
                "verification-method",
                "phone-verification",
                "wallet-connection",
                "identity-verification",
                "proxy-setup",
                "complete",
              ].map((step, index) => {
                const stepNumber = index + 1
                const isActive = currentStep === step
                const isCompleted =
                  ["welcome", "verification-method"].includes(step) &&
                  !["welcome", "verification-method"].includes(currentStep)

                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isActive
                          ? "bg-[#B03060] text-white"
                          : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {isCompleted ? "✓" : stepNumber}
                    </div>
                    {index < 6 && <div className={`w-8 h-0.5 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />}
                  </div>
                )
              })}
            </div>
          </div>

          {renderStepContent()}
        </div>
      </div>
    </div>
  )
}
