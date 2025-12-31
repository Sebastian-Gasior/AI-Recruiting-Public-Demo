import { useNavigate } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { PrivacyNotice } from '@/components/shared/PrivacyNotice'
import { Button } from '@/components/ui/button'

export default function LandingScreen() {
  const navigate = useNavigate()

  const handleStartAnalysis = () => {
    navigate('/input')
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 lg:py-16"
      lang="de"
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* PrivacyNotice Section */}
        <PrivacyNotice variant="landing" />

        {/* CTA Section */}
        <section className="flex flex-col items-center gap-4" aria-label="Call to Action Section">
          <h1 className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
            AI-Recruiting Analyse
          </h1>
          <Button
            onClick={handleStartAnalysis}
            size="lg"
            className="w-full sm:w-auto min-h-[44px] px-8"
            aria-label="Analyse starten Button"
          >
            Analyse starten
          </Button>

          {/* Desktop Hint */}
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Monitor className="h-4 w-4" aria-hidden="true" />
            Desktop empfohlen
          </p>
        </section>
      </div>
    </main>
  )
}
