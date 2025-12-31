import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { runAnalysis } from './AnalysisEngine'
import type { Profile } from '@/types/profile.types'
import { useProfile } from '@/contexts/ProfileContext'
import { useAnalysis } from '@/contexts/AnalysisContext'
import { PrivacyNotice } from '@/components/shared/PrivacyNotice'

/**
 * Type definition for location state passed from InputScreen
 */
interface AnalysisLocationState {
  profile: Profile
  jobPostingText: string
}

/**
 * Loading Screen component that displays informative stepper messages during analysis.
 * 
 * This component:
 * - Displays stepper messages for each analysis step
 * - Does NOT display percentage progress (as per PRD)
 * - Follows WCAG 2.1 AA standards with ARIA live region
 * - Uses Tailwind CSS with Privacy-First branding
 * - Integrates with Analysis Engine to show progress
 * 
 * **Stepper Messages:**
 * 1. "Analysiere Job-Anforderungen..."
 * 2. "Vergleiche Profile..."
 * 3. "Identifiziere Lücken..."
 * 4. "Berechne ATS-Score..."
 * 5. "Generiere Empfehlungen..."
 * 
 * **Accessibility:**
 * - ARIA live region announces step changes to screen readers
 * - WCAG 2.1 AA compliant
 * 
 * @component
 */
export default function LoadingScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile: contextProfile, jobPostingText: contextJobPostingText } = useProfile()
  const { setAnalysisResult } = useAnalysis()
  
  // Stepper messages array (in order of analysis steps)
  const steps = [
    'Analysiere Job-Anforderungen...',
    'Vergleiche Profile...',
    'Identifiziere Lücken...',
    'Berechne ATS-Score...',
    'Generiere Empfehlungen...',
  ]

  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Ref to track if component is mounted (for cleanup)
  const isMountedRef = useRef<boolean>(true)
  // Ref to store timeout IDs for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get profile and job posting from context (with fallback to location.state for backward compatibility)
  const state = location.state as AnalysisLocationState | null
  const profile = contextProfile || state?.profile || null
  const jobPostingText = contextJobPostingText || state?.jobPostingText || ''

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true

    // Validate inputs
    if (!profile || !jobPostingText) {
      setError('Fehlende Eingabedaten. Bitte kehren Sie zur Eingabeseite zurück.')
      setIsAnalyzing(false)
      return
    }

    // Run analysis with progress updates
    const performAnalysis = async () => {
      try {
        // Start timing to detect cache hit (very fast) vs cache miss (slower)
        const startTime = performance.now()

        // Run actual analysis first to check if it's a cache hit
        // Cache hit: < 10ms, Cache miss: > 100ms typically
        const result = runAnalysis(profile, jobPostingText)
        const analysisDuration = performance.now() - startTime

        // Store analysis result in context
        setAnalysisResult(result)

        // If analysis was very fast (cache hit), skip stepper messages and navigate immediately
        if (analysisDuration < 50) {
          // Cache hit - navigate immediately without showing stepper messages
          if (isMountedRef.current) {
            setIsAnalyzing(false)
            navigate('/results', { state: { analysisResult: result } })
          }
          return
        }

        // Cache miss - show stepper messages during analysis
        // Note: Analysis already completed, but we show progress for UX consistency
        if (!isMountedRef.current) return

        // Step 1: Parse job requirements
        setCurrentStep(0)
        await new Promise((resolve) => setTimeout(resolve, 300))

        if (!isMountedRef.current) return

        // Step 2: Match requirements (includes extractCandidateSignals and matchRequirements)
        setCurrentStep(1)
        await new Promise((resolve) => setTimeout(resolve, 400))

        if (!isMountedRef.current) return

        // Step 3: Identify gaps
        setCurrentStep(2)
        await new Promise((resolve) => setTimeout(resolve, 300))

        if (!isMountedRef.current) return

        // Step 4: Compute ATS score
        setCurrentStep(3)
        await new Promise((resolve) => setTimeout(resolve, 300))

        if (!isMountedRef.current) return

        // Step 5: Generate recommendations (includes buildExecutiveSummary and buildNextSteps)
        setCurrentStep(4)
        await new Promise((resolve) => setTimeout(resolve, 200))

        if (!isMountedRef.current) return

        // Navigate to results with analysis result
        setIsAnalyzing(false)

        // Use timeout with cleanup to prevent memory leak
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            navigate('/results', { state: { analysisResult: result } })
          }
        }, 500)
      } catch (err) {
        if (!isMountedRef.current) return

        // Provide more specific error messages
        if (err instanceof Error) {
          if (err.message.includes('Profile data')) {
            setError('Ungültige Profildaten. Bitte überprüfen Sie Ihre Eingaben.')
          } else if (err.message.includes('Job posting')) {
            setError('Ungültige Stellenausschreibung. Bitte überprüfen Sie Ihre Eingabe.')
          } else {
            setError(`Analyse-Fehler: ${err.message}`)
          }
        } else {
          setError('Ein unerwarteter Fehler ist aufgetreten.')
        }
        setIsAnalyzing(false)
      }
    }

    performAnalysis()

    // Cleanup function
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [profile, jobPostingText, navigate, setAnalysisResult])

  const handleBackToInput = () => {
    navigate('/input')
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 lg:py-16"
      lang="de"
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Privacy Notice */}
        <PrivacyNotice variant="landing" />

        {/* Loading Content */}
        <section
          className="flex flex-col items-center gap-6"
          aria-label="Analyse läuft"
        >
          <h1 className="text-2xl font-bold text-gray-900 sr-only">
            Analyse läuft
          </h1>

          {/* Loading Spinner */}
          <div
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
            aria-hidden="true"
          />

          {/* ARIA Live Region for Screen Readers */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            id="loading-status"
          >
            {isAnalyzing
              ? `Laden: ${steps[currentStep]}`
              : error
                ? `Fehler: ${error}`
                : 'Analyse abgeschlossen'}
          </div>

          {/* Current Step Message */}
          <div className="text-center">
            <p
              className="text-lg font-medium text-gray-900"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {isAnalyzing ? steps[currentStep] : error ? error : 'Analyse abgeschlossen'}
            </p>
          </div>

          {/* Stepper Indicators */}
          <div className="flex items-center gap-2" aria-label="Analyse-Schritte">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                  index < currentStep
                    ? 'bg-blue-600'
                    : index === currentStep
                      ? 'bg-blue-600 animate-pulse'
                      : 'bg-gray-300'
                }`}
                aria-label={
                  index < currentStep
                    ? `${step} abgeschlossen`
                    : index === currentStep
                      ? `${step} läuft`
                      : `${step} ausstehend`
                }
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
              role="alert"
            >
              <p className="font-medium">Fehler</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={handleBackToInput}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Zurück zur Eingabe
              </button>
            </div>
          )}

          {/* Note: No percentage progress displayed (as per PRD) */}
        </section>
      </div>
    </main>
  )
}
