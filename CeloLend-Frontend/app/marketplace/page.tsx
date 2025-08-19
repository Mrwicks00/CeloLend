"use client";

import { useState, useMemo } from "react";
import { Navigation } from "@/components/navigation";
import {
  LoanRequestCard,
  CreateLoanRequest,
  MarketplaceFilters,
  MarketplaceStats,
} from "@/components/marketplace";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { LoanRequest } from "@/hooks/useMarketplaceData";

export default function MarketplacePage() {
  const { loanRequests, marketStats, loading, error, refreshData } =
    useMarketplaceData();

  const [activeTab, setActiveTab] = useState("borrow-requests");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAsset, setFilterAsset] = useState("all");
  const [sortBy, setSortBy] = useState("interest-high");

  // Filter and sort loan requests
  const filteredRequests = useMemo(() => {
    return loanRequests
      .filter((request) => {
        if (
          searchTerm &&
          !request.collateralType
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
          return false;
        if (filterAsset !== "all" && request.collateralType !== filterAsset)
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "interest-high":
            return Number(b.interestRate) - Number(a.interestRate);
          case "interest-low":
            return Number(a.interestRate) - Number(b.interestRate);
          case "amount-high":
            return Number(b.amount) - Number(a.amount);
          case "amount-low":
            return Number(a.amount) - Number(b.amount);
          case "credit-high":
            return b.borrowerCreditScore - a.borrowerCreditScore;
          case "duration-short":
            return Number(a.duration) - Number(b.duration);
          case "duration-long":
            return Number(b.duration) - Number(a.duration);
          case "newest":
            return Number(b.createdAt) - Number(a.createdAt);
          case "oldest":
            return Number(a.createdAt) - Number(b.createdAt);
          default:
            return 0;
        }
      });
  }, [loanRequests, searchTerm, filterAsset, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Loan Marketplace
            </h1>
            <p className="text-muted-foreground">
              Fund individual borrowers or request loans with collateral
            </p>
          </div>

          {/* Filters */}
          <MarketplaceFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterAsset={filterAsset}
            setFilterAsset={setFilterAsset}
            sortBy={sortBy}
            setSortBy={setSortBy}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onRefresh={refreshData}
            loading={loading}
          />

          {/* Content based on active tab */}
          {activeTab === "borrow-requests" ? (
            <>
              {/* Loan Requests Grid */}
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-80 bg-muted rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <button
                    onClick={refreshData}
                    className="text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterAsset !== "all"
                      ? "No loan requests match your filters"
                      : "No active loan requests available"}
                  </p>
                  {searchTerm || filterAsset !== "all" ? (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterAsset("all");
                      }}
                      className="text-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      onClick={refreshData}
                      className="text-primary hover:underline"
                    >
                      Refresh
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {filteredRequests.map((request) => (
                    <LoanRequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}

              {/* Market Stats */}
              <MarketplaceStats stats={marketStats} loading={loading} />
            </>
          ) : (
            <CreateLoanRequest />
          )}
        </div>
      </div>
    </div>
  );
}
