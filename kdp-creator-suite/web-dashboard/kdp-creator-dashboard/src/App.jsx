import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { 
  FileText, 
  Image, 
  Zap, 
  Crown, 
  BarChart3, 
  Settings, 
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Activity
} from 'lucide-react'
import './App.css'

function App() {
  const [subscriptionTier, setSubscriptionTier] = useState('free')
  const [usageStats, setUsageStats] = useState({
    conversions: 2,
    batchOperations: 0,
    monthlyLimit: 5
  })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    // Simulate loading user data
    setRecentActivity([
      { id: 1, type: 'conversion', file: 'coloring-book-1.pdf', status: 'completed', time: '2 hours ago' },
      { id: 2, type: 'image_conversion', file: 'artwork.jpg', status: 'completed', time: '1 day ago' },
      { id: 3, type: 'batch_process', file: '5 files', status: 'failed', time: '2 days ago' },
    ])
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Routes>
          <Route path="/" element={<Dashboard 
            subscriptionTier={subscriptionTier}
            usageStats={usageStats}
            recentActivity={recentActivity}
            setSubscriptionTier={setSubscriptionTier}
          />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

function Dashboard({ subscriptionTier, usageStats, recentActivity, setSubscriptionTier }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">KDP Creator Suite</h1>
            <p className="text-lg text-gray-600">The ultimate all-in-one solution for Amazon KDP creators</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={subscriptionTier === 'free' ? 'secondary' : 'default'} className="text-sm px-3 py-1">
              {subscriptionTier === 'free' ? 'Free Tier' : subscriptionTier === 'pro' ? 'Pro' : 'Studio'}
            </Badge>
            {subscriptionTier === 'free' && (
              <Button onClick={() => setSubscriptionTier('pro')} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversions This Month</p>
                <p className="text-2xl font-bold text-gray-900">{usageStats.conversions}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <Progress 
              value={(usageStats.conversions / usageStats.monthlyLimit) * 100} 
              className="mt-3"
            />
            <p className="text-xs text-gray-500 mt-2">
              {usageStats.monthlyLimit - usageStats.conversions} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Batch Operations</p>
                <p className="text-2xl font-bold text-gray-900">{usageStats.batchOperations}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {subscriptionTier === 'free' ? 'Upgrade for batch processing' : 'Unlimited'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">96%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">KDP Compliance</p>
                <p className="text-2xl font-bold text-blue-600">100%</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">All conversions compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="convert">Convert</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Start converting your content for Amazon KDP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Convert PDF to KDP Format
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Image className="w-4 h-4 mr-2" />
                  Image to Coloring Book
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  disabled={subscriptionTier === 'free'}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Batch Processing
                  {subscriptionTier === 'free' && <Crown className="w-4 h-4 ml-auto" />}
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  disabled={subscriptionTier === 'free'}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Direct KDP Upload
                  {subscriptionTier === 'free' && <Crown className="w-4 h-4 ml-auto" />}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest conversions and operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {activity.type === 'conversion' && <FileText className="w-4 h-4 text-blue-600" />}
                        {activity.type === 'image_conversion' && <Image className="w-4 h-4 text-green-600" />}
                        {activity.type === 'batch_process' && <Zap className="w-4 h-4 text-yellow-600" />}
                        <div>
                          <p className="text-sm font-medium">{activity.file}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                      <Badge variant={activity.status === 'completed' ? 'default' : 'destructive'}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Why Choose KDP Creator Suite?</CardTitle>
              <CardDescription>The combined power of specialized tools in one platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">100% KDP Compliant</h3>
                  <p className="text-sm text-gray-600">Guaranteed compliance with Amazon KDP requirements including dynamic margins, bleed, and DPI settings.</p>
                </div>
                <div className="text-center p-4">
                  <Image className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Image to Coloring Book</h3>
                  <p className="text-sm text-gray-600">Transform any image into professional coloring book pages with advanced line art conversion.</p>
                </div>
                <div className="text-center p-4">
                  <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Batch Processing</h3>
                  <p className="text-sm text-gray-600">Process multiple files simultaneously with our powerful batch conversion engine.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="convert" className="space-y-6">
          <ConversionInterface subscriptionTier={subscriptionTier} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsPanel subscriptionTier={subscriptionTier} setSubscriptionTier={setSubscriptionTier} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ConversionInterface({ subscriptionTier }) {
  const [selectedFormat, setSelectedFormat] = useState('kindle_ebook')
  const [isProcessing, setIsProcessing] = useState(false)

  const formats = [
    { id: 'kindle_ebook', name: 'Kindle eBook', description: 'Optimized for digital reading' },
    { id: 'kindle_paperback', name: 'Kindle Paperback', description: 'Print-ready with bleed and margins' },
    { id: 'coloring_book_digital', name: 'Coloring Book (Digital)', description: 'Digital coloring book format' },
    { id: 'coloring_book_print', name: 'Coloring Book (Print)', description: 'Print-ready coloring book' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Conversion</CardTitle>
          <CardDescription>Convert your files to KDP-compliant formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">Target Format</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formats.map((format) => (
                <div
                  key={format.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedFormat === format.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <h3 className="font-medium">{format.name}</h3>
                  <p className="text-sm text-gray-600">{format.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload your files</h3>
            <p className="text-gray-600 mb-4">Drag and drop files here, or click to browse</p>
            <Button>Choose Files</Button>
          </div>

          {/* Processing Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Trim Size</label>
              <select className="w-full p-2 border rounded-md">
                <option>6" x 9" (Standard)</option>
                <option>5" x 8" (Compact)</option>
                <option>8.5" x 11" (Large)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quality</label>
              <select className="w-full p-2 border rounded-md">
                <option>High (300 DPI)</option>
                <option>Medium (150 DPI)</option>
                <option>Low (72 DPI)</option>
              </select>
            </div>
          </div>

          {/* Convert Button */}
          <Button 
            className="w-full" 
            size="lg"
            disabled={isProcessing}
            onClick={() => setIsProcessing(true)}
          >
            {isProcessing ? 'Processing...' : 'Convert Files'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">1,250</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-green-600 mt-2">↗ +8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">$8,900</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-green-600 mt-2">↗ +15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">12%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-green-600 mt-2">↗ +2% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Usage</CardTitle>
          <CardDescription>Most popular features in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">PDF Conversion</span>
              <div className="flex items-center space-x-2">
                <Progress value={85} className="w-32" />
                <span className="text-sm text-gray-600">2,100 uses</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Image to Coloring Book</span>
              <div className="flex items-center space-x-2">
                <Progress value={42} className="w-32" />
                <span className="text-sm text-gray-600">890 uses</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Batch Processing</span>
              <div className="flex items-center space-x-2">
                <Progress value={23} className="w-32" />
                <span className="text-sm text-gray-600">430 uses</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsPanel({ subscriptionTier, setSubscriptionTier }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>Manage your KDP Creator Suite subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 border rounded-lg ${subscriptionTier === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <h3 className="font-semibold mb-2">Free</h3>
              <p className="text-2xl font-bold mb-4">$0<span className="text-sm font-normal">/month</span></p>
              <ul className="text-sm space-y-2 mb-4">
                <li>✓ 5 conversions/month</li>
                <li>✓ Basic KDP compliance</li>
                <li>✗ Batch processing</li>
                <li>✗ Watermark-free</li>
              </ul>
              {subscriptionTier === 'free' && <Badge>Current Plan</Badge>}
            </div>

            <div className={`p-6 border rounded-lg ${subscriptionTier === 'pro' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <h3 className="font-semibold mb-2">Pro</h3>
              <p className="text-2xl font-bold mb-4">$19.99<span className="text-sm font-normal">/month</span></p>
              <ul className="text-sm space-y-2 mb-4">
                <li>✓ Unlimited conversions</li>
                <li>✓ Advanced KDP compliance</li>
                <li>✓ Batch processing (10 files)</li>
                <li>✓ Watermark-free</li>
                <li>✓ Priority support</li>
              </ul>
              {subscriptionTier === 'pro' ? (
                <Badge>Current Plan</Badge>
              ) : (
                <Button onClick={() => setSubscriptionTier('pro')} className="w-full">Upgrade</Button>
              )}
            </div>

            <div className={`p-6 border rounded-lg ${subscriptionTier === 'studio' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <h3 className="font-semibold mb-2">Studio</h3>
              <p className="text-2xl font-bold mb-4">$49.99<span className="text-sm font-normal">/month</span></p>
              <ul className="text-sm space-y-2 mb-4">
                <li>✓ Everything in Pro</li>
                <li>✓ Unlimited batch processing</li>
                <li>✓ Direct KDP integration</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Dedicated support</li>
              </ul>
              {subscriptionTier === 'studio' ? (
                <Badge>Current Plan</Badge>
              ) : (
                <Button onClick={() => setSubscriptionTier('studio')} className="w-full">Upgrade</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
