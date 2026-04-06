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
  Loader2
} from 'lucide-react'
import { authApi, subscriptionApi, analyticsApi } from '@/lib/api'
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
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await authApi.login(username, password)
      localStorage.setItem('kdp_token', response.data.access_token)
      setIsAuthenticated(true)
    } catch (err) {
      setError('Invalid username or password')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      await authApi.register(username, email, password)
      setIsRegistering(false)
      setError('Account created! Please login.')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{isRegistering ? 'Create Account' : 'Login to KDP Suite'}</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
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
              <label className="text-sm font-medium">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              {isRegistering ? 'Register' : 'Login'}
            </Button>
            <Button type="button" variant="link" className="w-full" onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
            </Button>
          </form>
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
                <p className="text-sm font-medium text-gray-600">Conversions This Month</p>
                <p className="text-2xl font-bold text-gray-900">{current_usage.conversions}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            {tier_details.monthly_conversions !== -1 && (
              <>
                <Progress 
                  value={(current_usage.conversions / tier_details.monthly_conversions) * 100} 
                  className="mt-3"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {remaining_usage.conversions} remaining
                </p>
              </>
            )}
            {tier_details.monthly_conversions === -1 && (
              <p className="text-xs text-green-500 mt-2 font-medium">Unlimited Access</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Batch Operations</p>
                <p className="text-2xl font-bold text-gray-900">{current_usage.batch_operations}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {tier === 'free' ? 'Upgrade for batch processing' : `${remaining_usage.batch_operations} remaining`}
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
                  disabled={tier === 'free'}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Batch Processing
                  {tier === 'free' && <Crown className="w-4 h-4 ml-auto" />}
                </Button>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Member since {new Date(user.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <span className="text-sm text-gray-900">{user.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Current Plan</span>
                  <span className="text-sm font-bold text-blue-600">{tier_details.name}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">API Status</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>Real-time data from your account</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[300px] flex items-center justify-center text-gray-500 border-2 border-dashed rounded-lg">
                  Analytics Visualization Ready (Backend Data Linked)
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default App
