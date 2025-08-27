"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  TrendingDown,
  Clock,
} from "lucide-react";
import { useLoanRepayment, LoanRepaymentInfo } from "@/hooks/useLoanRepayment";
import { useSupportedTokens } from "@/hooks/useSupportedTokens";

interface RepaymentCardProps {
  loanId: bigint;
  onPaymentSuccess?: () => void;
}

export function RepaymentCard({
  loanId,
  onPaymentSuccess,
}: RepaymentCardProps) {
  const {
    getLoanRepaymentInfo,
    calculateRepayment,
    makePayment,
    loading,
    repaymentInfo,
    calculation,
  } = useLoanRepayment();

  const { tokens: supportedTokens } = useSupportedTokens();

  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(
    "0x0000000000000000000000000000000000000000"
  ); // CELO
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localInfo, setLocalInfo] = useState<LoanRepaymentInfo | null>(null);

  // Load repayment info on mount
  useEffect(() => {
    const loadInfo = async () => {
      const info = await getLoanRepaymentInfo(loanId);
      setLocalInfo(info);
      if (info) {
        await calculateRepayment(loanId);
      }
    };
    loadInfo();
  }, [loanId, getLoanRepaymentInfo, calculateRepayment]);

  const info = localInfo || repaymentInfo;

  if (!info) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            Loading repayment information...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Status badge
  const getStatusBadge = () => {
    if (info.repaymentStatus === 1) {
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          Paid Off
        </Badge>
      );
    }
    if (info.repaymentStatus === 2) {
      return <Badge variant="destructive">Defaulted</Badge>;
    }
    if (info.isOverdue) {
      return (
        <Badge variant="destructive">Overdue ({info.daysOverdue} days)</Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-200"
      >
        Active
      </Badge>
    );
  };

  // Calculate progress
  const totalLoan = info.principalRemaining + info.interestAccrued;
  const paidAmount = totalLoan - info.principalRemaining;
  const progressPercentage =
    totalLoan > 0 ? (Number(paidAmount) / Number(totalLoan)) * 100 : 0;

  // Format amounts
  const formatAmount = (amount: bigint, decimals = 18) => {
    return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(4);
  };

  // Handle payment
  const handlePayment = async () => {
    if (!paymentAmount || !selectedToken) return;

    try {
      const amount = ethers.parseUnits(paymentAmount, 18);
      const success = await makePayment(loanId, amount, selectedToken);

      if (success) {
        setIsModalOpen(false);
        setPaymentAmount("");
        onPaymentSuccess?.();

        // Reload info
        await getLoanRepaymentInfo(loanId);
        await calculateRepayment(loanId);
      }
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  // Quick payment buttons
  const setQuickAmount = (percentage: number) => {
    if (!calculation) return;
    const amount = (calculation.fullAmount * BigInt(percentage)) / BigInt(100);
    setPaymentAmount(formatAmount(amount));
  };

  return (
    <Card className="w-full border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Loan #{loanId.toString()}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Payment Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Repayment Progress</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Amount Owed</p>
            <p className="font-semibold text-lg">
              {formatAmount(info.totalOwed)} CELO
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Principal Remaining</p>
            <p className="font-semibold">
              {formatAmount(info.principalRemaining)} CELO
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Interest Accrued</p>
            <p className="font-semibold text-orange-600">
              +{formatAmount(info.interestAccrued)} CELO
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Next Due Date</p>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(Number(info.nextDueDate) * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Warning for overdue */}
        {info.isOverdue && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Payment Overdue
              </p>
              <p className="text-xs text-yellow-600">
                Your payment is {info.daysOverdue} days late. Late fees may
                apply.
              </p>
            </div>
          </div>
        )}

        {/* Early payment bonus */}
        {info.isEarlyRepayment &&
          calculation?.earlyPaymentDiscount &&
          calculation.earlyPaymentDiscount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Early Payment Discount Available
                </p>
                <p className="text-xs text-green-600">
                  Pay in full now and save{" "}
                  {formatAmount(calculation.earlyPaymentDiscount)} CELO
                </p>
              </div>
            </div>
          )}

        {/* Payment Actions */}
        {info.repaymentStatus === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    Make Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Make Loan Payment</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Payment Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>

                    {/* Quick amount buttons */}
                    {calculation && (
                      <div className="space-y-2">
                        <Label>Quick Options</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPaymentAmount(
                                formatAmount(calculation.minimumPayment)
                              )
                            }
                          >
                            Min Payment
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickAmount(50)}
                          >
                            50%
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPaymentAmount(
                                formatAmount(calculation.fullAmount)
                              )
                            }
                          >
                            Pay in Full
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handlePayment}
                      disabled={loading || !paymentAmount}
                      className="w-full"
                    >
                      {loading ? "Processing..." : "Make Payment"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {calculation && (
                <Button
                  onClick={() => {
                    setPaymentAmount(formatAmount(calculation.fullAmount));
                    setIsModalOpen(true);
                  }}
                  className="flex-1"
                >
                  Pay in Full
                </Button>
              )}
            </div>

            {calculation && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  • Minimum payment: {formatAmount(calculation.minimumPayment)}{" "}
                  CELO
                </p>
                <p>
                  • Full amount: {formatAmount(calculation.fullAmount)} CELO
                </p>
                {calculation.earlyPaymentDiscount > 0 && (
                  <p className="text-green-600">
                    • Early discount: -
                    {formatAmount(calculation.earlyPaymentDiscount)} CELO
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
