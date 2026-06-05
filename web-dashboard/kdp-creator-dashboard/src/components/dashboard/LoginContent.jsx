import { useState } from 'react'
import { Key, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { authApi } from '@/lib/api'

export default function LoginContent({ setIsAuthenticated }) {
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
      const response = await authApi.login(username, password, needs2FA ? totpCode : undefined)
      if (response.data.requires_2fa) {
        setNeeds2FA(true)
        setIsSubmitting(false)
        return
      }
      localStorage.setItem('kdp_token', response.data.access_token)
      setIsAuthenticated(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password')
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
