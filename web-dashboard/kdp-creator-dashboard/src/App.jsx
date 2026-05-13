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
  Key,
  Moon,
  Sun,
  Save,
  Trash2
} from 'lucide-react'
import { authApi, subscriptionApi, analyticsApi, pdfApi, totpApi, batchApi, templateApi, supabase } from '@/lib/api'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import UpdatePasswordPage from '@/pages/UpdatePasswordPage.jsx'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true)
        fetchUserData()
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true)
        fetchUserData()
      } else {
        setIsAuthenticated(false)
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
      console.error('Logout failed', error)
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
  const [needs2FA, setNeeds2FA] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const { data, error } = await authApi.login(email || username, password)
      if (error) throw error
      // Session change listener will handle state update
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const { data, error } = await authApi.register(email, password, username)
      if (error) throw error
      setIsRegistering(false)
      setSuccess('Account created! Please check your email to confirm.')
    } catch (err) {
      setError(err.message || 'Registration failed')
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
              {needs2FA && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">2FA Code</label>
                  <Input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="Enter 6-digit code" required />
                </div>
              )}
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kdp_dark_mode') === 'true')
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('kdp_dark_mode', darkMode)
  }, [darkMode])

  useEffect(() => {
    templateApi.getAll().then(res => setTemplates(res.data.templates))
  }, [])

  const saveTemplate = async (name, trimSize, bleed) => {
    await templateApi.save({ name, trim_size: trimSize, bleed })
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const deleteTemplate = async (id) => {
    await templateApi.delete(id)
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const exportMetricsCSV = () => {
    if (!metrics) return
    const daily = metrics.daily_activity || []
    let csv = 'Date,Conversions,Batch Operations\n'
    daily.forEach(d => { csv += `${d.date},${d.conversions},${d.batch_ops}\n` })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kdp_analytics_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">KDP Creator Suite</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Welcome back, {user?.username}!</p>
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
            <Button variant="ghost" onClick={() => setDarkMode(!darkMode)} className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
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
        <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">AI Tools</TabsTrigger>
          <TabsTrigger value="queue">Batch Queue</TabsTrigger>
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
                <div className="pt-4 border-t mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Save as Template</p>
                    <Button size="sm" variant="outline" onClick={() => {
                      const name = prompt('Template name:')
                      if (name) {
                        const trimSize = document.getElementById('trim-size').value
                        const bleed = document.getElementById('target-format').value
                        saveTemplate(name, trimSize, bleed)
                      }
                    }}>
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                  </div>
                  {templates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 mb-1">Load template:</p>
                      {templates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                          <button className="text-blue-600 hover:underline" onClick={() => {
                            document.getElementById('trim-size').value = t.trim_size
                            document.getElementById('target-format').value = t.bleed
                          }}>{t.name}</button>
                          <button className="text-red-400 hover:text-red-600" onClick={() => deleteTemplate(t.id)}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

        <TabsContent value="queue">
          <BatchQueuePanel />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={exportMetricsCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Conversion Trends (Last 30 Days)</CardTitle>
                <CardDescription>Daily conversions and batch operations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics?.daily_activity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="conversions" stroke="#2563eb" strokeWidth={2} name="Conversions" />
                    <Line type="monotone" dataKey="batch_ops" stroke="#7c3aed" strokeWidth={2} name="Batch Ops" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>File Type Breakdown</CardTitle>
                  <CardDescription>Success rates by format</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={metrics?.file_types || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" name="Files Processed" />
                      <Bar dataKey="success_rate" fill="#16a34a" name="Success %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Usage vs Quota</CardTitle>
                  <CardDescription>Current month usage against your plan limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Conversions</span>
                      <span>{metrics?.usage_quota?.conversions_used || 0} / {metrics?.usage_quota?.conversions_limit === -1 ? '∞' : metrics?.usage_quota?.conversions_limit}</span>
                    </div>
                    <Progress value={metrics?.usage_quota?.conversions_limit === -1 ? 10 : ((metrics?.usage_quota?.conversions_used || 0) / (metrics?.usage_quota?.conversions_limit || 1) * 100)} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Batch Operations</span>
                      <span>{metrics?.usage_quota?.batch_used || 0} / {metrics?.usage_quota?.batch_limit === -1 ? '∞' : metrics?.usage_quota?.batch_limit}</span>
                    </div>
                    <Progress value={metrics?.usage_quota?.batch_limit === -1 ? 10 : ((metrics?.usage_quota?.batch_used || 0) / (metrics?.usage_quota?.batch_limit || 1) * 100)} className="h-3" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
                <h4 className="font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
                {user?.totp_enabled ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">2FA is enabled</p>
                    <p className="text-xs text-green-600 mt-1">Your account is protected with TOTP authentication.</p>
                    <Button variant="outline" className="mt-3 text-red-600 border-red-200" onClick={async () => {
                      const code = prompt('Enter your 2FA code to disable:')
                      if (code) {
                        try {
                          await totpApi.disable(code)
                          alert('2FA disabled')
                          window.location.reload()
                        } catch(e) { alert(e.response?.data?.error || 'Failed') }
                      }
                    }}>Disable 2FA</Button>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">2FA is not enabled</p>
                    <p className="text-xs text-yellow-600 mt-1">Enable two-factor authentication for extra security.</p>
                    <Button variant="outline" className="mt-3" onClick={async () => {
                      try {
                        const res = await totpApi.setup()
                        const secret = res.data.secret
                        const code = prompt(`Add this secret to your authenticator app:\n\n${secret}\n\nThen enter the 6-digit code to verify:`)
                        if (code) {
                          await totpApi.verify(code)
                          alert('2FA enabled successfully!')
                          window.location.reload()
                        }
                      } catch(e) { alert(e.response?.data?.error || 'Failed') }
                    }}>Enable 2FA</Button>
                  </div>
                )}
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

function BatchQueuePanel() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchJobs = async () => {
    try {
      const res = await batchApi.getJobs()
      setJobs(res.data.jobs || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (jobType, count) => {
    setSubmitting(true)
    try {
      await batchApi.submit(jobType, count)
      await fetchJobs()
    } catch(e) { alert(e.response?.data?.error || 'Failed to submit job') }
    finally { setSubmitting(false) }
  }

  const handleCancel = async (id) => {
    try {
      await batchApi.cancel(id)
      await fetchJobs()
    } catch(e) { alert(e.response?.data?.error || 'Failed to cancel') }
  }

  const statusColor = (s) => {
    if (s === 'completed') return 'bg-green-100 text-green-800'
    if (s === 'processing') return 'bg-blue-100 text-blue-800'
    if (s === 'failed') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Batch Job</CardTitle>
          <CardDescription>Queue multiple files for processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Job Type</label>
              <select id="batch-type" className="w-full p-2 border rounded-md text-sm">
                <option value="convert_image">Image to Coloring Page</option>
                <option value="convert_pdf">PDF KDP Format</option>
                <option value="validate">KDP Compliance Check</option>
              </select>
            </div>
            <div className="space-y-2 w-32">
              <label className="text-sm font-medium">Files</label>
              <Input id="batch-count" type="number" min="1" max="50" defaultValue="5" />
            </div>
            <Button className="bg-blue-600" disabled={submitting} onClick={() => {
              const type = document.getElementById('batch-type').value
              const count = parseInt(document.getElementById('batch-count').value) || 5
              handleSubmit(type, count)
            }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Job Queue</CardTitle>
          <CardDescription>Real-time status of your batch operations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No batch jobs yet. Submit one above.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(job.status)}`}>{job.status}</span>
                      <span className="text-sm font-medium">{job.job_type.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">#{job.id}</span>
                    </div>
                    {job.status === 'processing' && (
                      <div className="mt-2">
                        <Progress value={job.progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{job.processed_files}/{job.total_files} files ({job.progress}%)</p>
                      </div>
                    )}
                    {job.status === 'completed' && <p className="text-xs text-green-600 mt-1">{job.total_files} files processed</p>}
                    {job.error_message && <p className="text-xs text-red-500 mt-1">{job.error_message}</p>}
                  </div>
                  {(job.status === 'queued' || job.status === 'processing') && (
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleCancel(job.id)}>Cancel</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default App
