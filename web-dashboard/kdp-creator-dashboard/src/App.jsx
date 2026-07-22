import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { authApi, supabase } from '@/lib/api'
import { sessionBridge } from '@/lib/sessionBridge'
import UpdatePasswordPage from '@/pages/UpdatePasswordPage.jsx'
import DashboardContent from '@/components/dashboard/DashboardContent.jsx'
import LoginContent from '@/components/dashboard/LoginContent.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import './App.css'

const SESSION_CHECK_TIMEOUT = 10000

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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
        sessionBridge.clearSession()
        setIsAuthenticated(false)
        setUser(null)
        setLoading(false)
        setError(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
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
        console.warn('Profile sync failed; continuing with Supabase session', syncErr)
      }

      if (fetchId !== fetchUserDataIdRef.current) return

      setUser(sessionUser)
    } catch (err) {
      if (fetchId !== fetchUserDataIdRef.current) return

      console.error('Failed to fetch user data', err)

      if (err.message?.includes('timed out')) {
        console.warn('[TIMEOUT] Session check exceeded', SESSION_CHECK_TIMEOUT, 'ms')
        try {
          await supabase.auth.signOut()
        } catch {
          // ignore sign-out failures during bootstrap recovery
        }
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
