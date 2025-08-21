import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Clock, Star, AlertCircle, Eye } from "lucide-react";
import { LoanRequest } from "@/hooks/useMarketplaceData";
import {
  formatTokenAmount,
  formatAddress,
  getCreditScoreTier,
} from "@/lib/contracts/contractHelpers";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { useWallet } from "@/contexts/WalletContext";
import { useLoanRepayment } from "@/hooks/useLoanRepayment";
import { ethers } from "ethers";
import { toast } from "react-toastify";

interface LoanRequestCardProps {
  request: LoanRequest;
}

export function LoanRequestCard({ request }: LoanRequestCardProps) {
  const { fundLoan, cancelLoanRequest } = useMarketplaceData();
  const { address, isConnected } = useWallet();
  const { getLoanRepaymentInfo } = useLoanRepayment();
  const [fundAmount, setFundAmount] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const creditScoreInfo = getCreditScoreTier(request.borrowerCreditScore);
  const interestRatePercent = Number(request.interestRate) / 100; // Convert from basis points
  const fundingProgress =
    request.amount > BigInt(0)
      ? Number((request.fundedAmount * BigInt(100)) / request.amount)
      : 0;
  const timeRemaining = Math.max(
    0,
    Number(request.duration) - (Date.now() / 1000 - Number(request.createdAt))
  );
  const daysRemaining = Math.ceil(timeRemaining / (24 * 3600));

  // Calculate collateral ratio for display
  const calculateCollateralRatio = () => {
    try {
      // For now, assume all tokens have similar value (this is simplified)
      // In a real app, you'd use actual token prices
      const loanValue = Number(request.amount) / 1e18;
      const collateralValue = Number(request.collateralAmount) / 1e18;
      return loanValue > 0 ? (collateralValue / loanValue) * 100 : 0;
    } catch {
      return 0;
    }
  };

  const currentCollateralRatio = calculateCollateralRatio();

  const getRiskLevel = (creditScore: number): "low" | "medium" | "high" => {
    if (creditScore >= 75) return "low";
    if (creditScore >= 50) return "medium";
    return "high";
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-500/10 text-green-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400";
      case "high":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const handleFundLoan = async () => {
    if (!fundAmount || !isConnected) return;

    setIsFunding(true);
    setFundError(null);

    try {
      toast.info("Processing loan funding...", { autoClose: 2000 });
      const amount = ethers.parseEther(fundAmount);
      await fundLoan(request.id, amount);
      setFundAmount("");
      toast.success(`Successfully funded ${fundAmount} CELO!`, {
        autoClose: 5000,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to fund loan";
      setFundError(errorMsg);
      toast.error(`Funding failed: ${errorMsg}`, {
        autoClose: 7000,
      });
    } finally {
      setIsFunding(false);
    }
  };

  const handleCancelLoan = async () => {
    if (!isConnected) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      toast.info("Cancelling loan request...", { autoClose: 2000 });
      await cancelLoanRequest(request.id);
      toast.success(
        "Loan request cancelled! Your collateral has been returned.",
        {
          autoClose: 5000,
        }
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to cancel loan request";
      setCancelError(errorMsg);
      toast.error(`Cancellation failed: ${errorMsg}`, {
        autoClose: 7000,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Check if current user is the borrower
  const isOwnRequest =
    address && address.toLowerCase() === request.borrower.toLowerCase();
  const canCancel =
    isOwnRequest &&
    request.status === "open" &&
    request.fundedAmount === BigInt(0);

  // Check if loan is funded and borrower can repay
  const isFunded = request.fundedAmount > BigInt(0);
  const canRepay = isOwnRequest && isFunded;

  const FundLoanDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="btn-primary" disabled={!isConnected}>
          Fund Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fund Loan Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-card rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Interest Rate
              </span>
              <span className="font-semibold text-primary">
                {interestRatePercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="font-semibold">
                {Math.ceil(Number(request.duration) / (24 * 3600))} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Collateral</span>
              <span className="font-semibold">
                {(Number(request.collateralAmount) / 1e18).toFixed(2)}{" "}
                {request.collateralType}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Fund Amount (CELO)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              disabled={isFunding}
            />
            <p className="text-xs text-muted-foreground">
              Remaining:{" "}
              {(Number(request.amount - request.fundedAmount) / 1e18).toFixed(
                2
              )}{" "}
              CELO
            </p>
          </div>

          {fundError && (
            <div className="flex items-center space-x-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{fundError}</span>
            </div>
          )}

          <Button
            className="btn-primary w-full"
            onClick={handleFundLoan}
            disabled={isFunding || !fundAmount}
          >
            {isFunding ? "Funding..." : `Fund ${fundAmount || "0"} CELO`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-card-foreground">
                {(Number(request.amount) / 1e18).toFixed(2)} CELO
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatAddress(request.borrower)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge
              className={getRiskColor(
                getRiskLevel(request.borrowerCreditScore)
              )}
            >
              {getRiskLevel(request.borrowerCreditScore).toUpperCase()} RISK
            </Badge>
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-muted-foreground">
                {request.borrowerCompletedLoans} loans
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Interest Rate</span>
              <span className="font-semibold text-primary">
                {interestRatePercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold text-card-foreground">
                {Math.ceil(Number(request.duration) / (24 * 3600))} days
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Credit Score</span>
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-card-foreground">
                  {request.borrowerCreditScore}
                </span>
                <Badge
                  variant="secondary"
                  className={`text-xs ${creditScoreInfo.color}`}
                >
                  {creditScoreInfo.label}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold text-card-foreground">
                {request.borrowerCompletedLoans}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Collateral</span>
            <span className="text-sm font-semibold text-card-foreground">
              {(Number(request.collateralAmount) / 1e18).toFixed(2)}{" "}
              {request.collateralType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Purpose</span>
            <span className="text-sm font-semibold text-card-foreground">
              {request.purpose}
            </span>
          </div>
        </div>

        {request.status === "funding" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Funding Progress</span>
              <span className="font-semibold text-card-foreground">
                {(Number(request.fundedAmount) / 1e18).toFixed(2)} /{" "}
                {(Number(request.amount) / 1e18).toFixed(2)} CELO
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${fundingProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{daysRemaining}d remaining</span>
          </div>
          <span className="text-muted-foreground">
            {request.borrowerDefaultedLoans} defaults
          </span>
        </div>

        {cancelError && (
          <div className="flex items-center space-x-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{cancelError}</span>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          {canCancel ? (
            <Button
              variant="destructive"
              onClick={handleCancelLoan}
              disabled={isCancelling}
              className="bg-red-500 hover:bg-red-600"
            >
              {isCancelling ? "Cancelling..." : "Cancel Request"}
            </Button>
          ) : canRepay ? (
            <Button
              className="btn-primary w-full"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Manage Repayment
            </Button>
          ) : (
            <FundLoanDialog />
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-primary text-primary bg-transparent"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Loan Request Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      LOAN DETAILS
                    </h3>
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Amount:</span>{" "}
                        {(Number(request.amount) / 1e18).toFixed(2)} CELO
                      </p>
                      <p>
                        <span className="font-medium">Interest Rate:</span>{" "}
                        {(Number(request.interestRate) / 100).toFixed(2)}%
                      </p>
                      <p>
                        <span className="font-medium">Duration:</span>{" "}
                        {Math.ceil(Number(request.duration) / (24 * 3600))} days
                      </p>
                      <p>
                        <span className="font-medium">Purpose:</span>{" "}
                        {request.purpose}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      COLLATERAL
                    </h3>
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Amount:</span>{" "}
                        {(Number(request.collateralAmount) / 1e18).toFixed(2)}{" "}
                        {request.collateralType}
                      </p>
                      <p>
                        <span className="font-medium">Token:</span>{" "}
                        {request.collateralType}
                      </p>
                      <p>
                        <span className="font-medium">Ratio:</span>{" "}
                        {currentCollateralRatio.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Borrower Info */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    BORROWER PROFILE
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Address:</span>{" "}
                        {formatAddress(request.borrower, 8)}
                      </p>
                      <p>
                        <span className="font-medium">Credit Score:</span>
                        <Badge className={`ml-2 ${creditScoreInfo.color}`}>
                          {request.borrowerCreditScore} ({creditScoreInfo.label}
                          )
                        </Badge>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Completed Loans:</span>{" "}
                        {request.borrowerCompletedLoans}
                      </p>
                      <p>
                        <span className="font-medium">Defaults:</span>{" "}
                        {request.borrowerDefaultedLoans}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    RISK ASSESSMENT
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {getRiskLevel(
                          request.borrowerCreditScore
                        ).toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Risk Level
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {currentCollateralRatio.toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Collateral Ratio
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {daysRemaining}d
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Time Remaining
                      </div>
                    </div>
                  </div>
                </div>

                {/* Funding Status */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    FUNDING STATUS
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge
                        variant={
                          request.status === "open" ? "default" : "secondary"
                        }
                      >
                        {request.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Funded Amount:</span>
                      <span>
                        {(Number(request.fundedAmount) / 1e18).toFixed(2)} CELO
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining:</span>
                      <span>
                        {(
                          Number(request.amount - request.fundedAmount) / 1e18
                        ).toFixed(2)}{" "}
                        CELO
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
