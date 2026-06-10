import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authApi, supabase } from '@/lib/api'
import UpdatePasswordPage from '@/pages/UpdatePasswordPage.jsx'
import DashboardContent from '@/components/dashboard/DashboardContent.jsx'
import LoginContent from '@/components/dashboard/LoginContent.jsx'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('kdp_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check Supabase session on mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        localStorage.setItem('kdp_token', session.access_token)
        setIsAuthenticated(true)
      } else if (!localStorage.getItem('kdp_token')) {
        setIsAuthenticated(false)
        setLoading(false)
      }
    }
    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('kdp_token', session.access_token)
        setIsAuthenticated(true)
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('kdp_token')
        setIsAuthenticated(false)
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Use Supabase user metadata as fallback
        setUser({
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email,
          id: session.user.id,
        })
      }
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
          <Route path="/login" element={!isAuthenticated ? <LoginContent setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
          <Route path="/auth/callback" element={<UpdatePasswordPage />} />
          <Route path="/" element={isAuthenticated ? <DashboardContent user={user} handleLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
