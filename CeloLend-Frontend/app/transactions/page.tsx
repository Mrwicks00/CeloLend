"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Bell,
} from "lucide-react"

type Transaction = {
  id: string
  type: "borrow" | "lend" | "deposit" | "withdraw" | "repay" | "liquidation"
  amount: number
  asset: string
  counterparty?: string
  status: "pending" | "completed" | "failed" | "cancelled"
  timestamp: string
  txHash: string
  gasUsed?: number
  gasFee?: number
  description: string
}

type Notification = {
  id: string
  type: "loan_due" | "liquidation_warning" | "payment_received" | "loan_funded" | "system_update"
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: "low" | "medium" | "high"
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("transactions")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateRange, setDateRange] = useState("all")

  // Mock data - in real app this would come from API/blockchain
  const transactions: Transaction[] = [
    {
      id: "1",
      type: "borrow",
      amount: 5000,
      asset: "USDC",
      counterparty: "0x1234...5678",
      status: "completed",
      timestamp: "2025-01-12T10:30:00Z",
      txHash: "0xabcd1234...",
      gasUsed: 21000,
      gasFee: 15.2,
      description: "Borrowed 5000 USDC with ETH collateral",
    },
    {
      id: "2",
      type: "deposit",
      amount: 3.2,
      asset: "ETH",
      status: "completed",
      timestamp: "2025-01-12T09:15:00Z",
      txHash: "0xefgh5678...",
      gasUsed: 45000,
      gasFee: 32.1,
      description: "Deposited ETH as collateral",
    },
    {
      id: "3",
      type: "lend",
      amount: 8000,
      asset: "USDC",
      counterparty: "0x9876...5432",
      status: "completed",
      timestamp: "2025-01-11T16:45:00Z",
      txHash: "0xijkl9012...",
      gasUsed: 28000,
      gasFee: 18.7,
      description: "Lent 8000 USDC at 9.1% APR",
    },
    {
      id: "4",
      type: "repay",
      amount: 2500,
      asset: "USDC",
      counterparty: "0xabcd...efgh",
      status: "pending",
      timestamp: "2025-01-11T14:20:00Z",
      txHash: "0xmnop3456...",
      description: "Partial loan repayment",
    },
    {
      id: "5",
      type: "withdraw",
      amount: 1.5,
      asset: "ETH",
      status: "failed",
      timestamp: "2025-01-10T11:30:00Z",
      txHash: "0xqrst7890...",
      gasUsed: 21000,
      gasFee: 12.3,
      description: "Attempted collateral withdrawal - insufficient health factor",
    },
  ]

  const notifications: Notification[] = [
    {
      id: "1",
      type: "loan_due",
      title: "Loan Payment Due Soon",
      message: "Your loan of 5000 USDC is due in 3 days. Please ensure sufficient funds for repayment.",
      timestamp: "2025-01-12T08:00:00Z",
      read: false,
      priority: "high",
    },
    {
      id: "2",
      type: "liquidation_warning",
      title: "Liquidation Risk Warning",
      message: "Your ETH collateral health factor has dropped to 1.3. Consider adding more collateral.",
      timestamp: "2025-01-11T20:15:00Z",
      read: false,
      priority: "high",
    },
    {
      id: "3",
      type: "payment_received",
      title: "Payment Received",
      message: "Received 850 USDC interest payment from loan #12345.",
      timestamp: "2025-01-11T14:30:00Z",
      read: true,
      priority: "medium",
    },
    {
      id: "4",
      type: "loan_funded",
      title: "Loan Successfully Funded",
      message: "Your lending offer of 8000 USDC has been accepted and funded.",
      timestamp: "2025-01-11T10:45:00Z",
      read: true,
      priority: "medium",
    },
    {
      id: "5",
      type: "system_update",
      title: "Platform Maintenance Complete",
      message: "Scheduled maintenance has been completed. All services are now fully operational.",
      timestamp: "2025-01-10T06:00:00Z",
      read: true,
      priority: "low",
    },
  ]

  const filteredTransactions = transactions.filter((tx) => {
    if (searchTerm && !tx.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterType !== "all" && tx.type !== filterType) return false
    if (filterStatus !== "all" && tx.status !== filterStatus) return false
    return true
  })

  const unreadNotifications = notifications.filter((n) => !n.read).length

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "borrow":
        return <ArrowDownRight className="w-5 h-5 text-[#B03060]" />
      case "lend":
        return <ArrowUpRight className="w-5 h-5 text-[#B03060]" />
      case "deposit":
        return <Plus className="w-5 h-5 text-green-600" />
      case "withdraw":
        return <Minus className="w-5 h-5 text-red-600" />
      case "repay":
        return <CheckCircle className="w-5 h-5 text-blue-600" />
      case "liquidation":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "cancelled":
        return <XCircle className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    }
    return <Badge className={variants[status as keyof typeof variants] || variants.pending}>{status}</Badge>
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "loan_due":
        return <Clock className="w-5 h-5 text-yellow-600" />
      case "liquidation_warning":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case "payment_received":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "loan_funded":
        return <ArrowUpRight className="w-5 h-5 text-blue-600" />
      case "system_update":
        return <Shield className="w-5 h-5 text-gray-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-gray-100 text-gray-800",
    }
    return <Badge className={variants[priority as keyof typeof variants]}>{priority}</Badge>
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction History</h1>
              <p className="text-gray-600">View your transaction history and notifications</p>
            </div>
            <Button className="btn-primary text-white">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                Notifications
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {unreadNotifications}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-6">
              {/* Filters */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="search">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="search"
                          placeholder="Search transactions..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Transaction Type</Label>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="borrow">Borrow</SelectItem>
                          <SelectItem value="lend">Lend</SelectItem>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="withdraw">Withdraw</SelectItem>
                          <SelectItem value="repay">Repay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger>
                          <SelectValue placeholder="All time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">Last 7 days</SelectItem>
                          <SelectItem value="month">Last 30 days</SelectItem>
                          <SelectItem value="quarter">Last 3 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction List */}
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <Card key={transaction.id} className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg capitalize">
                              {transaction.type} {transaction.amount} {transaction.asset}
                            </h3>
                            <p className="text-sm text-gray-600">{transaction.description}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <span>{new Date(transaction.timestamp).toLocaleString()}</span>
                              {transaction.counterparty && <span>With: {transaction.counterparty}</span>}
                              {transaction.gasFee && <span>Gas: ${transaction.gasFee}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(transaction.status)}
                              {getStatusBadge(transaction.status)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">TX: {transaction.txHash.slice(0, 10)}...</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
                    <p className="text-gray-600">Try adjusting your filters or check back later</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Notifications ({unreadNotifications} unread)</h2>
                <Button
                  variant="outline"
                  className="border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                >
                  Mark All Read
                </Button>
              </div>

              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`border-0 shadow-lg ${!notification.read ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`font-semibold ${!notification.read ? "text-blue-900" : "text-gray-900"}`}>
                                {notification.title}
                              </h3>
                              {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                            <p className={`text-sm ${!notification.read ? "text-blue-800" : "text-gray-600"}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">{getPriorityBadge(notification.priority)}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {notifications.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
                    <p className="text-gray-600">You're all caught up!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
