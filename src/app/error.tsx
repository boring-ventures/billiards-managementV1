'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { logError } from '@/lib/logging'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our logging system
    try {
      if (typeof logError === 'function') {
        logError('GlobalError', 'Application error', error, {
          digest: error.digest,
          componentStack: (error as any).componentStack || 'Not available',
        })
      } else {
        console.error('Application error:', error)
      }
    } catch (loggingError) {
      console.error('Error while logging error:', loggingError)
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Something went wrong</CardTitle>
              <CardDescription className="text-center">
                We're sorry, but we encountered an unexpected error.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-center text-muted-foreground">
                Our team has been notified of this issue and we're working to fix it as soon as possible.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 rounded-md bg-gray-900 p-4 text-xs text-white">
                  <p className="font-bold">{error.name}: {error.message}</p>
                  {error.stack && (
                    <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                  {error.digest && (
                    <p className="mt-2 text-gray-400">Error Digest: {error.digest}</p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Button
                onClick={() => reset()}
                variant="outline"
              >
                Try again
              </Button>
              <Button asChild>
                <Link href="/">Go to homepage</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  )
}
 