import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, RefreshCw } from "lucide-react";

interface MarketplaceFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterAsset: string;
  setFilterAsset: (asset: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function MarketplaceFilters({
  searchTerm,
  setSearchTerm,
  filterAsset,
  setFilterAsset,
  sortBy,
  setSortBy,
  activeTab,
  setActiveTab,
  onRefresh,
  loading = false,
}: MarketplaceFiltersProps) {
  const assetOptions = [
    { value: "all", label: "All Assets" },
    { value: "CELO", label: "CELO" },
    { value: "cUSD", label: "cUSD" },
    { value: "cEUR", label: "cEUR" },
    { value: "cREAL", label: "cREAL" },
    { value: "USDC", label: "USDC" },
  ];

  const sortOptions = [
    { value: "interest-high", label: "Interest: High to Low" },
    { value: "interest-low", label: "Interest: Low to High" },
    { value: "amount-high", label: "Amount: High to Low" },
    { value: "amount-low", label: "Amount: Low to High" },
    { value: "credit-high", label: "Credit Score: High to Low" },
    { value: "duration-short", label: "Duration: Short to Long" },
    { value: "duration-long", label: "Duration: Long to Short" },
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
  ];

  return (
    <Card className="border-0 shadow-lg mb-8 bg-card">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Assets</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="USDC, CELO, cUSD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>

          {/* Asset Filter */}
          <div className="space-y-2">
            <Label>Asset Type</Label>
            <Select value={filterAsset} onValueChange={setFilterAsset}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Assets" />
              </SelectTrigger>
              <SelectContent>
                {assetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label>Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Tabs */}
          <div className="space-y-2">
            <Label>View</Label>
            <div className="flex space-x-2">
              <Button
                variant={
                  activeTab === "borrow-requests" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setActiveTab("borrow-requests")}
                className="flex-1"
              >
                Loan Requests
              </Button>
              <Button
                variant={activeTab === "create-request" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("create-request")}
                className="flex-1"
              >
                Create Request
              </Button>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || filterAsset !== "all") && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Active filters:
              </span>
              {searchTerm && (
                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                  Search: "{searchTerm}"
                </span>
              )}
              {filterAsset !== "all" && (
                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                  Asset:{" "}
                  {assetOptions.find((a) => a.value === filterAsset)?.label}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterAsset("all");
                }}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
