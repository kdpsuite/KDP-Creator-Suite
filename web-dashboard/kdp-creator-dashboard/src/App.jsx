import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Loader2, AlertCircle, Key } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { FormField } from '@/components/FormField'
import {
  authApi,
  clearMfaToken,
  getMfaToken,
  setMfaToken,
  supabase,
  totpApi,
} from '@/lib/api'
import { sessionBridge } from '@/lib/sessionBridge'
import UpdatePasswordPage from '@/pages/UpdatePasswordPage.jsx'
import DashboardContent from '@/components/dashboard/DashboardContent.jsx'
import LoginContent from '@/components/dashboard/LoginContent.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import './App.css'

const SESSION_CHECK_TIMEOUT = 10000

const isBootstrapFailure = (err) => {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (code === 'MFA_REQUIRED') return false
  return (
    !err?.response ||
    status === 401 ||
    err.message?.includes('timed out')
  )
}

function MfaChallenge({ email, onVerified, onCancel }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await totpApi.validate(code.trim())
      const mfaToken = response?.data?.data?.mfa_token
      if (!mfaToken) {
        setError('Verification succeeded but no session token was returned')
        return
      }
      setMfaToken(mfaToken)
      onVerified()
    } catch (err) {
      const status = err?.response?.status
      const message = err?.response?.data?.error?.message || err?.message || 'Invalid code'
      if (status === 429) {
        setError(message)
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Two-factor authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code for {email || 'your account'} to finish signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Authenticator code"
              name="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder="123456"
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
              Verify
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
              Cancel and log out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchUserDataIdRef = useRef(0)

  useEffect(() => {
    let active = true
    let bridgeSubscription = null

    const checkSession = async () => {
      try {
        bridgeSubscription = await sessionBridge.init()
        if (!active) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return

        if (session) {
          setIsAuthenticated(true)
        } else {
          clearMfaToken()
          setMfaRequired(false)
          setIsAuthenticated(false)
          setUser(null)
          setLoading(false)
        }
      } catch (sessionError) {
        if (!active) return
        console.error('Failed to restore session', sessionError)
        setIsAuthenticated(false)
        setUser(null)
        setLoading(false)
      }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true)
        setError(null)
      } else if (event === 'SIGNED_OUT') {
        fetchUserDataIdRef.current += 1
        clearMfaToken()
        setMfaRequired(false)
        sessionBridge.clearSession()
        setIsAuthenticated(false)
        setUser(null)
        setLoading(false)
        setError(null)
      }
    })

    const onMfaRequired = () => {
      setMfaRequired(true)
    }
    window.addEventListener('kdp_mfa_required', onMfaRequired)

    return () => {
      active = false
      subscription.unsubscribe()
      window.removeEventListener('kdp_mfa_required', onMfaRequired)
      if (bridgeSubscription) {
        bridgeSubscription.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData()
    }
  }, [isAuthenticated])

  const fetchUserData = async () => {
    const fetchId = ++fetchUserDataIdRef.current

    try {
      setLoading(true)
      setError(null)

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Session check timed out. Please refresh the page.'))
        }, SESSION_CHECK_TIMEOUT)
      })

      const sessionPromise = supabase.auth.getSession()
      const { data: { session } } = await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])

      if (fetchId !== fetchUserDataIdRef.current) return

      if (!session) {
        setIsAuthenticated(false)
        setMfaRequired(false)
        setUser(null)
        return
      }

      const sessionUser = {
        email: session.user.email,
        username: session.user.user_metadata?.username || session.user.email,
        id: session.user.id,
      }

      try {
        await authApi.syncProfile()
      } catch (syncErr) {
        if (isBootstrapFailure(syncErr)) {
          throw syncErr
        }
        console.warn('Profile sync failed; continuing with Supabase session', syncErr)
      }

      if (fetchId !== fetchUserDataIdRef.current) return

      let totpEnabled = false
      try {
        const meResp = await authApi.getMe()
        totpEnabled = Boolean(meResp?.data?.data?.totp_enabled)
      } catch (meErr) {
        if (isBootstrapFailure(meErr)) {
          throw meErr
        }
        console.warn('Profile fetch failed; continuing without MFA status', meErr)
      }

      if (fetchId !== fetchUserDataIdRef.current) return

      if (totpEnabled && !getMfaToken()) {
        setUser(sessionUser)
        setMfaRequired(true)
        return
      }

      setMfaRequired(false)
      setUser(sessionUser)
    } catch (err) {
      if (fetchId !== fetchUserDataIdRef.current) return

      console.error('Failed to fetch user data', err)

      if (isBootstrapFailure(err)) {
        if (err.message?.includes('timed out')) {
          console.warn('[TIMEOUT] Session check exceeded', SESSION_CHECK_TIMEOUT, 'ms')
        }
        try {
          await supabase.auth.signOut()
        } catch {
          // ignore sign-out failures during bootstrap recovery
        }
        clearMfaToken()
        setMfaRequired(false)
        setIsAuthenticated(false)
        setUser(null)
        setError(null)
      } else {
        setError(err.message || 'Failed to load dashboard data. Please try again.')
      }
    } finally {
      if (fetchId === fetchUserDataIdRef.current) {
        setLoading(false)
      }
    }
  }

  const handleLogout = async () => {
    fetchUserDataIdRef.current += 1
    clearMfaToken()
    setMfaRequired(false)
    sessionBridge.clearSession()
    try {
      await authApi.logout()
    } catch (logoutError) {
      console.error('Logout failed on server', logoutError)
    } finally {
      setIsAuthenticated(false)
      setUser(null)
      setError(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading your dashboard...</p>
          <p className="text-muted-foreground text-xs mt-2">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  if (error && isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center p-6 bg-card rounded-lg shadow-lg max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Dashboard Load Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchUserData}>
            Retry
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="ml-2">
            Logout
          </Button>
        </div>
      </div>
    )
  }

  if (mfaRequired) {
    return (
      <MfaChallenge
        email={user?.email}
        onVerified={() => setMfaRequired(false)}
        onCancel={handleLogout}
      />
    )
  }

  if (isAuthenticated && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Preparing your session...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Toaster richColors position="top-right" />
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <LoginContent setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
            <Route path="/auth/callback" element={<UpdatePasswordPage />} />
            <Route path="/" element={isAuthenticated ? <DashboardContent user={user} handleLogout={handleLogout} /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
