import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

/**
 * NotFound Component - 404 Not Found Page
 *
 * Displays a user-friendly 404 error page when an invalid route is accessed.
 * Provides navigation options to return to the landing page or go back.
 *
 * Follows WCAG 2.1 AA accessibility standards with proper ARIA labels and keyboard navigation.
 */
export function NotFound() {
  const navigate = useNavigate()
  const homeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus management for accessibility
  useEffect(() => {
    homeButtonRef.current?.focus()
  }, [])

  const handleGoBack = () => {
    // Check if there's browser history, otherwise navigate to home
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <main
      className="container mx-auto max-w-2xl px-4 py-16"
      role="main"
      aria-label="404 Seite nicht gefunden"
      lang="de"
    >
      <Card role="alert" aria-live="polite">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-900">
            404 - Seite nicht gefunden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-700">
            Die angeforderte Seite konnte nicht gefunden werden. Die URL ist möglicherweise
            falsch oder die Seite wurde verschoben.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              ref={homeButtonRef}
              onClick={() => navigate('/')}
              className="w-full sm:w-auto"
              aria-label="Zur Startseite zurückkehren"
            >
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Zur Startseite
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full sm:w-auto"
              aria-label="Zur vorherigen Seite zurückkehren"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Zurück
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default NotFound

