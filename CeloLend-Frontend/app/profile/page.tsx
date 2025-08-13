"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { User, Phone, Wallet, Shield, Bell, Eye, EyeOff, Edit, Trash2, Plus, CheckCircle, Settings } from "lucide-react"

export default function ProfilePage() {
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [notifications, setNotifications] = useState({
    loanUpdates: true,
    priceAlerts: false,
    marketingEmails: false,
    securityAlerts: true,
  })

  // Mock user data - in real app this would come from API/blockchain
  const userProfile = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    joinDate: "2024-12-15",
    kycStatus: "verified",
    creditScore: 742,
    totalLoans: 12,
    successRate: 98.5,
  }

  const linkedWallets = [
    {
      id: "1",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      type: "MetaMask",
      isPrimary: true,
      balance: "2.45 ETH",
      lastUsed: "2025-01-12",
    },
    {
      id: "2",
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      type: "WalletConnect",
      isPrimary: false,
      balance: "0.15 BTC",
      lastUsed: "2025-01-10",
    },
  ]

  const linkedAccounts = [
    {
      id: "1",
      type: "Bank Account",
      name: "Chase Checking ****1234",
      status: "verified",
      addedDate: "2024-12-20",
    },
    {
      id: "2",
      type: "Credit Card",
      name: "Visa ****5678",
      status: "pending",
      addedDate: "2025-01-05",
    },
  ]

  const securitySettings = [
    {
      id: "1",
      name: "Two-Factor Authentication",
      description: "Add an extra layer of security to your account",
      enabled: true,
      type: "2fa",
    },
    {
      id: "2",
      name: "Email Notifications",
      description: "Receive security alerts via email",
      enabled: true,
      type: "email",
    },
    {
      id: "3",
      name: "SMS Notifications",
      description: "Receive security alerts via SMS",
      enabled: false,
      type: "sms",
    },
    {
      id: "4",
      name: "Login Alerts",
      description: "Get notified of new device logins",
      enabled: true,
      type: "login",
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile & Settings</h1>
            <p className="text-gray-600">Manage your account, security, and preferences</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Profile Summary */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{userProfile.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{userProfile.email}</p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">KYC Status</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Credit Score</span>
                      <span className="font-semibold text-green-600">{userProfile.creditScore}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Loans</span>
                      <span className="font-semibold">{userProfile.totalLoans}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-semibold text-green-600">{userProfile.successRate}%</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <p className="text-xs text-gray-500">
                    Member since {new Date(userProfile.joinDate).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="personal" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="wallets">Wallets</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" defaultValue={userProfile.name} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" defaultValue={userProfile.email} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" type="tel" defaultValue={userProfile.phone} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timezone">Timezone</Label>
                          <Input id="timezone" defaultValue="UTC-5 (Eastern Time)" />
                        </div>
                      </div>
                      <Button className="btn-primary text-white">Save Changes</Button>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Identity Verification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-900">KYC Verification Complete</p>
                            <p className="text-sm text-green-800">Your identity has been successfully verified</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Phone className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="font-semibold text-blue-900">Phone Verification</p>
                            <p className="text-sm text-blue-800">Phone number verified via SMS</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Linked Financial Accounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {linkedAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{account.name}</p>
                            <p className="text-sm text-gray-600">
                              {account.type} • Added {account.addedDate}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              className={
                                account.status === "verified"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {account.status}
                            </Badge>
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Financial Account
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="wallets" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Wallet className="w-5 h-5 mr-2" />
                        Connected Wallets
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {linkedWallets.map((wallet) => (
                        <div key={wallet.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold">{wallet.type}</p>
                                <p className="text-sm text-gray-600">
                                  {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {wallet.isPrimary && <Badge className="bg-blue-100 text-blue-800">Primary</Badge>}
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Balance</p>
                              <p className="font-semibold">{wallet.balance}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Last Used</p>
                              <p className="font-semibold">{wallet.lastUsed}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button className="btn-primary text-white w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Connect New Wallet
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Proxy Wallet</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Shield className="w-6 h-6 text-blue-600 mt-1" />
                          <div>
                            <p className="font-semibold text-blue-900">Proxy Wallet Active</p>
                            <p className="text-sm text-blue-800 mb-2">
                              Your proxy wallet handles transactions automatically for better security and gas
                              optimization.
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Proxy Address:</span>
                                <span className="font-mono">0xproxy...1234</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span>Private Key:</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono">
                                    {showPrivateKey ? "0x1234567890abcdef..." : "••••••••••••••••"}
                                  </span>
                                  <Button size="sm" variant="ghost" onClick={() => setShowPrivateKey(!showPrivateKey)}>
                                    {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Security Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {securitySettings.map((setting) => (
                        <div key={setting.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{setting.name}</p>
                            <p className="text-sm text-gray-600">{setting.description}</p>
                          </div>
                          <Switch checked={setting.enabled} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Password & Recovery</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                      <Button className="btn-primary text-white">Update Password</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Notification Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">Loan Updates</p>
                          <p className="text-sm text-gray-600">Get notified about loan status changes</p>
                        </div>
                        <Switch
                          checked={notifications.loanUpdates}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, loanUpdates: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">Price Alerts</p>
                          <p className="text-sm text-gray-600">Receive alerts for significant price changes</p>
                        </div>
                        <Switch
                          checked={notifications.priceAlerts}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, priceAlerts: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">Marketing Emails</p>
                          <p className="text-sm text-gray-600">Receive updates about new features and promotions</p>
                        </div>
                        <Switch
                          checked={notifications.marketingEmails}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, marketingEmails: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">Security Alerts</p>
                          <p className="text-sm text-gray-600">Important security notifications (recommended)</p>
                        </div>
                        <Switch
                          checked={notifications.securityAlerts}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, securityAlerts: checked })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Privacy Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">Profile Visibility</p>
                          <p className="text-sm text-gray-600">Make your profile visible to other users</p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">Transaction History</p>
                          <p className="text-sm text-gray-600">Allow others to see your transaction history</p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">Analytics & Cookies</p>
                          <p className="text-sm text-gray-600">Help us improve the platform with usage data</p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
