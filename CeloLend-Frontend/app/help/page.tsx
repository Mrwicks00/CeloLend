"use client"

import type React from "react"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Mail,
  BookOpen,
  HelpCircle,
  Send,
  Clock,
  CheckCircle,
  Users,
} from "lucide-react"

type FAQ = {
  id: string
  category: string
  question: string
  answer: string
  helpful: number
  tags: string[]
}

type Tutorial = {
  id: string
  title: string
  description: string
  duration: string
  difficulty: "beginner" | "intermediate" | "advanced"
  steps: string[]
  category: string
}

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [openFAQs, setOpenFAQs] = useState<string[]>([])
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    category: "",
    subject: "",
    message: "",
  })

  const faqCategories = ["all", "getting-started", "borrowing", "lending", "collateral", "security", "fees"]

  const faqs: FAQ[] = [
    {
      id: "1",
      category: "getting-started",
      question: "How do I get started with DeFi Lend?",
      answer:
        "Getting started is easy! First, complete our onboarding process by verifying your phone number or connecting your wallet. Then, deposit collateral to start borrowing or provide liquidity to start lending. Our platform guides you through each step.",
      helpful: 45,
      tags: ["onboarding", "verification", "wallet"],
    },
    {
      id: "2",
      category: "borrowing",
      question: "What collateral types are accepted?",
      answer:
        "We accept various collateral types including cryptocurrencies (ETH, BTC), stablecoins (USDC, USDT), and Real World Assets (RWA) tokens like tokenized real estate and gold. Each asset has different loan-to-value ratios and requirements.",
      helpful: 38,
      tags: ["collateral", "crypto", "rwa", "assets"],
    },
    {
      id: "3",
      category: "lending",
      question: "How do I earn interest by lending?",
      answer:
        "To start earning, browse our marketplace for borrowing requests or create your own lending offer. Set your preferred interest rate, loan duration, and collateral requirements. Once matched with a borrower, you'll start earning interest automatically.",
      helpful: 42,
      tags: ["lending", "interest", "marketplace"],
    },
    {
      id: "4",
      category: "security",
      question: "How secure is my collateral?",
      answer:
        "Your collateral is secured by smart contracts and held in escrow until loan completion. We use industry-standard security practices, multi-signature wallets, and regular security audits. Your assets are protected by blockchain technology and our proxy wallet system.",
      helpful: 51,
      tags: ["security", "smart-contracts", "escrow"],
    },
    {
      id: "5",
      category: "fees",
      question: "What fees does DeFi Lend charge?",
      answer:
        "We charge a small platform fee of 0.5% on successful loans, plus standard blockchain gas fees for transactions. There are no hidden fees - all costs are transparent and shown before you confirm any transaction.",
      helpful: 33,
      tags: ["fees", "costs", "transparent"],
    },
    {
      id: "6",
      category: "collateral",
      question: "What happens if my collateral value drops?",
      answer:
        "If your collateral value drops below the liquidation threshold, you'll receive warnings to add more collateral or repay part of your loan. If the health factor drops too low, automatic liquidation may occur to protect lenders.",
      helpful: 29,
      tags: ["liquidation", "health-factor", "risk"],
    },
  ]

  const tutorials: Tutorial[] = [
    {
      id: "1",
      title: "Your First Loan",
      description: "Learn how to borrow funds using your crypto as collateral",
      duration: "5 min",
      difficulty: "beginner",
      category: "borrowing",
      steps: [
        "Complete account verification",
        "Deposit collateral (ETH, BTC, or other accepted assets)",
        "Choose loan amount and terms",
        "Review and confirm the loan",
        "Receive funds in your wallet",
      ],
    },
    {
      id: "2",
      title: "Becoming a Lender",
      description: "Start earning passive income by lending to borrowers",
      duration: "7 min",
      difficulty: "beginner",
      category: "lending",
      steps: [
        "Browse the lending marketplace",
        "Review borrower profiles and collateral",
        "Set your interest rate and terms",
        "Fund the loan",
        "Monitor your investment and collect interest",
      ],
    },
    {
      id: "3",
      title: "Managing Collateral Risk",
      description: "Advanced strategies for maintaining healthy loan positions",
      duration: "10 min",
      difficulty: "advanced",
      category: "risk-management",
      steps: [
        "Understanding health factors and LTV ratios",
        "Setting up price alerts and notifications",
        "Strategies for adding collateral during market volatility",
        "When and how to partially repay loans",
        "Using multiple collateral types for diversification",
      ],
    },
    {
      id: "4",
      title: "Using Real World Assets (RWA)",
      description: "How to use tokenized real-world assets as collateral",
      duration: "8 min",
      difficulty: "intermediate",
      category: "rwa",
      steps: [
        "Understanding RWA tokens and their benefits",
        "Verifying RWA token authenticity",
        "Depositing RWA tokens as collateral",
        "Managing RWA-backed loans",
        "Withdrawal and redemption processes",
      ],
    },
  ]

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleFAQ = (faqId: string) => {
    setOpenFAQs((prev) => (prev.includes(faqId) ? prev.filter((id) => id !== faqId) : [...prev, faqId]))
  }

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle support form submission
    console.log("Support form submitted:", supportForm)
    // Reset form
    setSupportForm({ name: "", email: "", category: "", subject: "", message: "" })
  }

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      beginner: "bg-green-100 text-green-800",
      intermediate: "bg-yellow-100 text-yellow-800",
      advanced: "bg-red-100 text-red-800",
    }
    return <Badge className={variants[difficulty as keyof typeof variants]}>{difficulty}</Badge>
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Help & Support</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find answers to common questions, learn how to use the platform, or get in touch with our support team
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse FAQs</h3>
                <p className="text-gray-600 text-sm">Find quick answers to common questions</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#C85062] to-[#FF6F61] rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">View Tutorials</h3>
                <p className="text-gray-600 text-sm">Step-by-step guides to get you started</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF6F61] to-[#E57373] rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Support</h3>
                <p className="text-gray-600 text-sm">Get personalized help from our team</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="faq" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="faq">FAQs</TabsTrigger>
              <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="faq" className="space-y-6">
              {/* Search and Filter */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="faq-search">Search FAQs</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="faq-search"
                          placeholder="Search questions, answers, or tags..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="getting-started">Getting Started</SelectItem>
                          <SelectItem value="borrowing">Borrowing</SelectItem>
                          <SelectItem value="lending">Lending</SelectItem>
                          <SelectItem value="collateral">Collateral</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="fees">Fees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ List */}
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <Card key={faq.id} className="border-0 shadow-lg">
                    <Collapsible open={openFAQs.includes(faq.id)} onOpenChange={() => toggleFAQ(faq.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-left">{faq.question}</CardTitle>
                            {openFAQs.includes(faq.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <p className="text-gray-700 mb-4">{faq.answer}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {faq.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <span>{faq.helpful} people found this helpful</span>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}

                {filteredFAQs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No FAQs found</h3>
                    <p className="text-gray-600">Try adjusting your search terms or browse all categories</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tutorials" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {tutorials.map((tutorial) => (
                  <Card key={tutorial.id} className="border-0 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-2">{tutorial.title}</CardTitle>
                          <p className="text-gray-600 text-sm">{tutorial.description}</p>
                        </div>
                        {getDifficultyBadge(tutorial.difficulty)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{tutorial.duration}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{tutorial.steps.length} steps</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {tutorial.steps.map((step, index) => (
                          <div key={index} className="flex items-center space-x-3 text-sm">
                            <div className="w-6 h-6 bg-[#B03060] text-white rounded-full flex items-center justify-center text-xs font-semibold">
                              {index + 1}
                            </div>
                            <span className="text-gray-700">{step}</span>
                          </div>
                        ))}
                      </div>
                      <Button className="btn-primary text-white w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Start Tutorial
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Contact Form */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Send us a Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSupportSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="support-name">Name</Label>
                          <Input
                            id="support-name"
                            value={supportForm.name}
                            onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="support-email">Email</Label>
                          <Input
                            id="support-email"
                            type="email"
                            value={supportForm.email}
                            onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={supportForm.category}
                          onValueChange={(value) => setSupportForm({ ...supportForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">Technical Issue</SelectItem>
                            <SelectItem value="account">Account Problem</SelectItem>
                            <SelectItem value="transaction">Transaction Issue</SelectItem>
                            <SelectItem value="security">Security Concern</SelectItem>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="support-subject">Subject</Label>
                        <Input
                          id="support-subject"
                          value={supportForm.subject}
                          onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="support-message">Message</Label>
                        <Textarea
                          id="support-message"
                          rows={5}
                          value={supportForm.message}
                          onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                          placeholder="Please describe your issue or question in detail..."
                          required
                        />
                      </div>

                      <Button type="submit" className="btn-primary text-white w-full">
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <div className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Other Ways to Reach Us</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-[#B03060]" />
                        <div>
                          <p className="font-semibold">Email Support</p>
                          <p className="text-sm text-gray-600">support@defilend.com</p>
                          <p className="text-xs text-gray-500">Response within 24 hours</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <MessageCircle className="w-5 h-5 text-[#B03060]" />
                        <div>
                          <p className="font-semibold">Live Chat</p>
                          <p className="text-sm text-gray-600">Available 24/7</p>
                          <Button size="sm" className="btn-primary text-white mt-2">
                            Start Chat
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Users className="w-5 h-5 text-[#B03060]" />
                        <div>
                          <p className="font-semibold">Community Forum</p>
                          <p className="text-sm text-gray-600">Get help from other users</p>
                          <p className="text-xs text-gray-500">forum.defilend.com</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Support Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Live Chat</span>
                        <Badge className="bg-green-100 text-green-800">24/7</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Email Support</span>
                        <span className="text-sm font-medium">24 hours</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Phone Support</span>
                        <span className="text-sm font-medium">Mon-Fri 9AM-6PM EST</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Status & Updates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">All systems operational</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Last updated: 2 minutes ago</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                      >
                        View Status Page
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
