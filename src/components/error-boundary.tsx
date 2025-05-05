'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { logError } from '@/lib/logging'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  section?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches JavaScript errors in its child component tree,
 * logs them, and displays a fallback UI instead of crashing the whole application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    console.error('Error boundary caught error:', error, errorInfo)
    
    // Use structured logging if available
    try {
      if (typeof logError === 'function') {
        logError(
          'ErrorBoundary', 
          `Error in ${this.props.section || 'unknown'} section`, 
          error, 
          { componentStack: errorInfo.componentStack }
        )
      }
    } catch (loggingError) {
      console.error('Error while logging error:', loggingError)
    }
    
    // Call user-provided error handler if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              There was an error loading this section. You can try refreshing the page or clicking the retry button below.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-900 text-white p-3 rounded-md mb-4 overflow-auto max-h-64 text-xs">
                <p className="font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                <p className="whitespace-pre-wrap">{this.state.error.stack}</p>
              </div>
            )}
            <div className="flex gap-4 mt-4">
              <Button 
                variant="outline" 
                onClick={this.handleRetry}
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button 
                variant="default" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
} 