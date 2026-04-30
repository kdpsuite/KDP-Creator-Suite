import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Input } from '@/components/ui/input.jsx'
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
  Activity,
  LogOut,
  Loader2,
  Key
} from 'lucide-react'
import { authApi, subscriptionApi, analyticsApi, pdfApi } from '@/lib/api'
import UpdatePasswordPage from '@/pages/UpdatePasswordPage.jsx'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('kdp_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const response = await authApi.getMe()
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user data', error)
      setIsAuthenticated(false)
      localStorage.removeItem('kdp_token')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout failed on server', error)
    } finally {
      localStorage.removeItem('kdp_token')
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
          <Route path="/auth/callback" element={<UpdatePasswordPage />} />
          <Route path="/" element={isAuthenticated ? <Dashboard user={user} handleLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('demo_user')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await authApi.login(username, password)
      localStorage.setItem('kdp_token', response.data.access_token)
      setIsAuthenticated(true)
    } catch (err) {
      setError('Invalid username or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await authApi.register(username, email, password)
      setIsRegistering(false)
      setSuccess('Account created! Please login.')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)
    try {
      await authApi.requestPasswordReset(email)
      setSuccess('Password reset link has been sent to your email.')
      setTimeout(() => setIsResetting(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request password reset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTitle = () => {
    if (isResetting) return 'Reset Password'
    if (isRegistering) return 'Create Account'
    return 'Login to KDP Suite'
  }

  const getDescription = () => {
    if (isResetting) return 'Enter your email to receive a reset link'
    return 'Enter your credentials to access the dashboard'
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {isResetting ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Send Reset Link
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setIsResetting(false)}>
                Back to Login
              </Button>
            </form>
          ) : (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              {isRegistering && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Password</label>
                  {!isRegistering && (
                    <button 
                      type="button" 
                      onClick={() => setIsResetting(true)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isRegistering ? 'Register' : 'Login')}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setSuccess('');
              }}>
                {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Dashboard({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [subscription, setSubscription] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [resultType, setResultType] = useState('image')

  const handleImageConvert = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setPreviewImage(null);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('user_id', user.id);
      
      const response = await pdfApi.convertImage(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.image_data);
        setResultType('image');
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error) {
      console.error('Conversion failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfProcess = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setPreviewImage(null);
      setResultType('pdf');
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('user_id', user.id);
      formData.append('trim_size', document.getElementById('trim-size').value);
      formData.append('target_format', document.getElementById('target-format').value);
      
      const response = await pdfApi.convertToKdp(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.pdf_data);
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error) {
      console.error('PDF processing failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultData) return;
    const link = document.createElement('a');
    const mime = resultType === 'pdf' ? 'application/pdf' : 'image/png';
    const ext = resultType === 'pdf' ? 'pdf' : 'png';
    link.href = `data:${mime};base64,${resultData}`;
    link.download = `kdp_conversion_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [subRes, metricsRes] = await Promise.all([
          subscriptionApi.getStatus(),
          analyticsApi.getUserMetrics()
        ])
        setSubscription(subRes.data)
        setMetrics(metricsRes.data.metrics)
      } catch (error) {
        console.error('Failed to load dashboard data', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  const handleUpgrade = async (tier) => {
    try {
      await subscriptionApi.upgrade(tier)
      const response = await subscriptionApi.getStatus()
      setSubscription(response.data)
    } catch (error) {
      console.error('Upgrade failed', error)
    }
  }

  if (loading || !subscription || !metrics) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const { tier, tier_details, current_usage, remaining_usage } = subscription

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">KDP Creator Suite</h1>
            <p className="text-lg text-gray-600">Welcome back, {user?.username}!</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={tier === 'free' ? 'secondary' : 'default'} className="text-sm px-3 py-1">
              {tier_details.name} Tier
            </Badge>
            {tier === 'free' && (
              <Button onClick={() => handleUpgrade('pro')} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
            <Button variant="ghost" onClick={handleLogout} className="text-gray-600 hover:text-red-600">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900">${metrics.monthly_revenue}</h3>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+12.5% from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Books Published</p>
                <h3 className="text-2xl font-bold text-gray-900">{metrics.books_published}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <Activity className="w-4 h-4 mr-1" />
              <span>{remaining_usage.pdf_conversions} conversions left</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Ads</p>
                <h3 className="text-2xl font-bold text-gray-900">{metrics.active_ads}</h3>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-purple-600">
              <Users className="w-4 h-4 mr-1" />
              <span>{metrics.total_reach.toLocaleString()} total reach</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Efficiency Score</p>
                <h3 className="text-2xl font-bold text-gray-900">{metrics.efficiency_score}%</h3>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={metrics.efficiency_score} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">AI Tools</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Conversions</CardTitle>
                <CardDescription>Your latest PDF and image processing activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${activity.type === 'pdf' ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {activity.type === 'pdf' ? <FileText className="w-4 h-4 text-red-600" /> : <Image className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{activity.filename}</p>
                          <p className="text-sm text-gray-500">{activity.date}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
                <CardDescription>Current billing cycle usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>PDF Conversions</span>
                    <span className="font-medium">{current_usage.pdf_conversions} / {tier_details.limits.pdf_conversions}</span>
                  </div>
                  <Progress value={(current_usage.pdf_conversions / tier_details.limits.pdf_conversions) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Image Processing</span>
                    <span className="font-medium">{current_usage.image_processing} / {tier_details.limits.image_processing}</span>
                  </div>
                  <Progress value={(current_usage.image_processing / tier_details.limits.image_processing) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Cloud Storage</span>
                    <span className="font-medium">{current_usage.storage_gb}GB / {tier_details.limits.storage_gb}GB</span>
                  </div>
                  <Progress value={(current_usage.storage_gb / tier_details.limits.storage_gb) * 100} />
                </div>
                <Button variant="outline" className="w-full">View Billing Details</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Image className="w-5 h-5 mr-2 text-blue-600" />
                  PDF to Coloring Book
                </CardTitle>
                <CardDescription>Convert any PDF page into a high-quality KDP coloring page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={() => document.getElementById('image-upload').click()}>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10MB</p>
                  <input type="file" id="image-upload" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleImageConvert(e.target.files[0])} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Line Weight</label>
                    <select className="w-full p-2 border rounded-md text-sm">
                      <option>Medium (Default)</option>
                      <option>Thin</option>
                      <option>Thick</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detail Level</label>
                    <select className="w-full p-2 border rounded-md text-sm">
                      <option>High</option>
                      <option>Balanced</option>
                      <option>Simplified</option>
                    </select>
                  </div>
                </div>
                <Button className="w-full bg-blue-600" onClick={() => document.getElementById('image-upload').click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Convert to Coloring Page
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-red-600" />
                  KDP Interior Formatter
                </CardTitle>
                <CardDescription>Auto-format your PDF interior for standard KDP trim sizes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-red-400 transition-colors cursor-pointer" onClick={() => document.getElementById('pdf-upload').click()}>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Upload your book interior</p>
                  <p className="text-xs text-gray-400 mt-1">PDF only up to 50MB</p>
                  <input type="file" id="pdf-upload" className="hidden" accept="application/pdf" onChange={(e) => handlePdfProcess(e.target.files[0])} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trim Size</label>
                    <select id="trim-size" className="w-full p-2 border rounded-md text-sm">
                      <option value="8.5x11">8.5" x 11"</option>
                      <option value="6x9">6" x 9"</option>
                      <option value="8.25x8.25">8.25" x 8.25"</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bleed</label>
                    <select id="target-format" className="w-full p-2 border rounded-md text-sm">
                      <option value="bleed">Bleed (Recommended)</option>
                      <option value="no-bleed">No Bleed</option>
                    </select>
                  </div>
                </div>
                <Button className="w-full bg-red-600" onClick={() => document.getElementById('pdf-upload').click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Format for KDP
                </Button>
              </CardContent>
            </Card>
          </div>

          {previewImage && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Processing Result</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="max-w-md w-full border rounded-lg overflow-hidden mb-4">
                  <img src={previewImage} alt="Preview" className="w-full h-auto" />
                </div>
                <div className="flex space-x-4">
                  <Button onClick={downloadResult}>
                    <Download className="w-4 h-4 mr-2" />
                    Download {resultType.toUpperCase()}
                  </Button>
                  <Button variant="outline" onClick={() => setPreviewImage(null)}>Clear</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Publishing Performance</CardTitle>
              <CardDescription>Track your KDP sales and organic reach</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Advanced Analytics Dashboard</p>
                  <p className="text-sm text-gray-400">Connect your KDP account to view real-time data</p>
                  <Button className="mt-4" variant="outline">Connect KDP Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your profile and subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Profile Information</h4>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Username</label>
                    <Input value={user?.username} disabled />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Email</label>
                    <Input value={user?.email} disabled />
                  </div>
                  <Button variant="outline">Update Profile</Button>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Subscription</h4>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Current Plan: {tier_details.name}</p>
                    <p className="text-xs text-blue-700 mt-1">Next billing date: May 22, 2026</p>
                  </div>
                  <div className="space-y-2">
                    <Button className="w-full bg-blue-600">Change Plan</Button>
                    <Button variant="ghost" className="w-full text-red-600">Cancel Subscription</Button>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-4">API Access</h4>
                <div className="flex items-center space-x-2">
                  <Input value="sk_live_51P8Xk2L8j..." type="password" readOnly />
                  <Button variant="outline">Copy Key</Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Use this key to integrate KDP Suite with your custom workflows.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default App
