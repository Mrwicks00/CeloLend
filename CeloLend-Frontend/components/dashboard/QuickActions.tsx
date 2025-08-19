"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandCoins, ArrowDownRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";

export function QuickActions() {
  const router = useRouter();
  const { isVerified } = useSelfProtocol();

  const handleAction = (action: string) => {
    switch (action) {
      case "fund-loans":
        router.push("/marketplace");
        break;
      case "request-loan":
        if (!isVerified) {
          router.push("/onboarding");
        } else {
          router.push("/marketplace?tab=create-request");
        }
        break;
      case "add-collateral":
        router.push("/collateral");
        break;
      default:
        break;
    }
  };

  return (
    <Card className="border-0 shadow-lg mb-8 bg-card">
      <CardHeader>
        <CardTitle className="text-xl text-card-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            className="btn-primary p-6 h-auto flex flex-col items-center space-y-2"
            onClick={() => handleAction("fund-loans")}
          >
            <HandCoins className="w-8 h-8" />
            <span className="font-semibold">Fund Loans</span>
            <span className="text-sm opacity-90">Lend to borrowers</span>
          </Button>

          <Button
            variant="outline"
            className="p-6 h-auto flex flex-col items-center space-y-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
            onClick={() => handleAction("request-loan")}
          >
            <ArrowDownRight className="w-8 h-8" />
            <span className="font-semibold">Request Loan</span>
            <span className="text-sm opacity-90">
              {isVerified
                ? "Borrow with collateral"
                : "Complete verification first"}
            </span>
          </Button>

          <Button
            variant="outline"
            className="p-6 h-auto flex flex-col items-center space-y-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
            onClick={() => handleAction("add-collateral")}
          >
            <Plus className="w-8 h-8" />
            <span className="font-semibold">Add Collateral</span>
            <span className="text-sm opacity-90">Improve loan terms</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
