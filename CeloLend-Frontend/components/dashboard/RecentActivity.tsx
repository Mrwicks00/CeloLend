"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, HandCoins, ArrowDownRight, Shield } from "lucide-react";

interface ActivityItem {
  id: number;
  type: "lend" | "borrow" | "collateral_deposit";
  asset: string;
  amount: number;
  counterparty: string;
  date: string;
  status: "completed" | "pending" | "failed";
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  // Mock data for now - will be replaced with real transaction data
  const mockActivities: ActivityItem[] = [
    {
      id: 1,
      type: "lend",
      asset: "USDC",
      amount: 5000,
      counterparty: "0x1234...5678",
      date: "2025-01-10",
      status: "completed",
    },
    {
      id: 2,
      type: "borrow",
      asset: "DAI",
      amount: 3000,
      counterparty: "0x9876...4321",
      date: "2025-01-09",
      status: "completed",
    },
    {
      id: 3,
      type: "collateral_deposit",
      asset: "ETH",
      amount: 8000,
      counterparty: "0x5555...7777",
      date: "2025-01-08",
      status: "completed",
    },
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "lend":
        return <HandCoins className="w-4 h-4 text-primary-foreground" />;
      case "borrow":
        return <ArrowDownRight className="w-4 h-4 text-primary-foreground" />;
      case "collateral_deposit":
        return <Shield className="w-4 h-4 text-primary-foreground" />;
      default:
        return <HandCoins className="w-4 h-4 text-primary-foreground" />;
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case "lend":
        return `Funded loan for ${activity.counterparty}`;
      case "borrow":
        return `Borrowed from ${activity.counterparty}`;
      case "collateral_deposit":
        return `Deposited collateral to ${activity.counterparty}`;
      default:
        return "Transaction";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400";
      case "failed":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-xl text-card-foreground">
          Recent P2P Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center space-x-3 p-3 bg-muted rounded-lg"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">
                  {getActivityDescription(activity)}
                </p>
                <p className="text-xs text-muted-foreground">{activity.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-card-foreground">
                  ${activity.amount.toLocaleString()} {activity.asset}
                </p>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getStatusColor(activity.status)}`}
                >
                  {activity.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <Button variant="ghost" className="w-full mt-4 text-primary">
          <Clock className="w-4 h-4 mr-2" />
          View All Activity
        </Button>
      </CardContent>
    </Card>
  );
}
