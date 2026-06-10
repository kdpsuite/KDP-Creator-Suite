import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import UpdatePasswordPage from '@/pages/UpdatePasswordPage.jsx'
import DashboardContent from '@/components/dashboard/DashboardContent.jsx'
import LoginContent from '@/components/dashboard/LoginContent.jsx'
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
