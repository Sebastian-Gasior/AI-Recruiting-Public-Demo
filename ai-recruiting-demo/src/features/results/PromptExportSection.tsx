import { useState, useEffect, useRef } from 'react'
import type { AnalysisResult } from '@/types/analysis.types'
import { generateCoverLetterPrompt } from '@/utils/promptExport'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Prompt Export Section Props
 */
export interface PromptExportSectionProps {
  analysisResult: AnalysisResult
  jobPostingText: string
  className?: string
}

/**
 * Prompt Export Section Component
 * 
 * Displays a curated prompt for external LLMs (e.g., cover letter generation).
 * 
 * **Features:**
 * - Generates curated prompt using `generateCoverLetterPrompt()` utility
 * - Displays prompt in read-only textarea
 * - Provides copy-to-clipboard functionality
 * - Shows mandatory warning about external provider privacy
 * 
 * **Privacy Considerations:**
 * - Mandatory warning about data sharing with external LLM providers (FR54)
 * - Users must understand data will be shared externally
 * 
 * **Accessibility:**
 * - WCAG 2.1 Level AA compliant
 * - Keyboard navigation support
 * - ARIA labels for screen readers
 * 
 * @component
 */
export function PromptExportSection({
  analysisResult,
  jobPostingText,
  className,
}: PromptExportSectionProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate prompt using utility function
  const promptText = generateCoverLetterPrompt(analysisResult, jobPostingText)
  
  // Check if prompt is meaningful (has role title and at least strengths or gaps, not just hints)
  // A valid prompt should have role title and at least one meaningful section (strengths or gaps)
  // Hints section alone is not enough - we need actual analysis data
  const isPromptValid = promptText && 
    promptText.trim().length > 0 && 
    promptText.includes('**Rolle:**') &&
    (promptText.includes('**Stärken (Top Passungen):**') || 
     promptText.includes('**Wichtige Lücken (beim Anschreiben berücksichtigen):**'))

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * Handle copy to clipboard
   */
  const handleCopy = async () => {
    try {
      // Clear any previous error
      setCopyError(null)
      
      // Validate clipboard API availability
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error('Clipboard API nicht verfügbar. Bitte verwenden Sie einen modernen Browser.')
      }

      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      
      // Clear previous timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Reset copied state after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
        timeoutRef.current = null
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Kopieren in die Zwischenablage.'
      setCopyError(errorMessage)
      setCopied(false)
    }
  }

  return (
    <Card
      role="region"
      aria-label="Prompt Export"
      className={cn('w-full', className)}
    >
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          Prompt Export für externe LLMs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mandatory Privacy Warning */}
        <Alert
          variant="destructive"
          role="alert"
          aria-live="polite"
          className="border-orange-500 bg-orange-50 dark:bg-orange-950"
        >
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm text-orange-900 dark:text-orange-100">
            <strong>⚠️ Wichtig:</strong> Dieser Prompt enthält persönliche Daten. Externe
            LLM-Anbieter (z.B. ChatGPT, Claude) können diese Daten speichern und für Training
            verwenden. Nutzen Sie diesen Prompt nur, wenn Sie mit der Datenweitergabe einverstanden
            sind.
          </AlertDescription>
        </Alert>

        {/* Prompt Text Display */}
        <div className="space-y-2">
          <label
            htmlFor="prompt-text"
            className="text-sm font-medium text-gray-700"
          >
            Generierter Prompt:
          </label>
          <textarea
            id="prompt-text"
            readOnly
            value={promptText}
            className="w-full min-h-[200px] rounded-md border border-gray-300 bg-gray-50 p-3 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Generierter Prompt für externe LLMs"
            aria-describedby="prompt-description"
          />
          <p id="prompt-description" className="text-xs text-gray-500">
            Dieser Prompt kann in externe LLM-Tools kopiert werden, um ein Anschreiben zu
            generieren.
          </p>
        </div>

        {/* Copy Error Message */}
        {copyError && (
          <Alert variant="destructive" role="alert" aria-live="polite">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{copyError}</AlertDescription>
          </Alert>
        )}

        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          variant="default"
          className="w-full sm:w-auto"
          aria-label={copied ? 'Prompt kopiert' : 'Prompt in Zwischenablage kopieren'}
          disabled={!isPromptValid}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Kopiert!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              In Zwischenablage kopieren
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

