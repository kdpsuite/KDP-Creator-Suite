import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * ErrorBoundary Component
 * 
 * Catches React errors and displays a user-friendly error message
 * instead of crashing the entire application.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo)
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }))
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV
      const errorMessage = this.state.error?.message || 'An unexpected error occurred'
      const errorStack = this.state.errorInfo?.componentStack

      return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
            {/* Error Icon */}
            <div className="mb-4 flex justify-center">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
              Something Went Wrong
            </h1>

            {/* Error Description */}
            <p className="mb-6 text-center text-gray-600">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>

            {/* Error Message (Development Only) */}
            {isDevelopment && (
              <div className="mb-6 rounded-lg bg-red-50 p-4">
                <p className="mb-2 text-sm font-semibold text-red-900">Error Details:</p>
                <p className="mb-4 font-mono text-xs text-red-800">{errorMessage}</p>
                {errorStack && (
                  <details className="cursor-pointer">
                    <summary className="text-xs font-semibold text-red-900 hover:underline">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs text-red-900">
                      {errorStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Error Count Warning */}
            {this.state.errorCount > 2 && (
              <div className="mb-6 rounded-lg bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  Multiple errors detected ({this.state.errorCount}). A page reload is recommended.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reload Page
              </button>
            </div>

            {/* Support Link */}
            <p className="mt-6 text-center text-xs text-gray-500">
              Still having issues?{' '}
              <a href="mailto:support@kdpsuite.com" className="text-blue-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
