import { useLocation, useNavigate } from 'react-router-dom'
import type { AnalysisResult, SkillRequirementResult, RoleFocusRisk } from '@/types'
import { useAnalysis } from '@/contexts/AnalysisContext'
import { useProfile } from '@/contexts/ProfileContext'
import { GapActionCard } from '@/components/results/GapActionCard'
import { ATSScoreBreakdown } from '@/components/results/ATSScoreBreakdown'
import { NextStepsChecklist } from '@/components/results/NextStepsChecklist'
import { PromptExportSection } from './PromptExportSection'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Feature flag for Prompt Export (can be enabled/disabled)
// Can be changed to environment variable: import.meta.env.VITE_ENABLE_PROMPT_EXPORT === 'true'
const ENABLE_PROMPT_EXPORT = import.meta.env.VITE_ENABLE_PROMPT_EXPORT !== 'false' // Default: enabled unless explicitly disabled

export interface ResultsScreenProps {
  result: AnalysisResult
  jobPostingText?: string
  className?: string
}

/**
 * Maps match status to display configuration
 */
function getStatusConfig(status: 'met' | 'partial' | 'missing') {
  switch (status) {
    case 'met':
      return {
        label: 'Erfüllt',
        icon: CheckCircle2,
        iconClass: 'text-success-500',
        badgeClass: 'bg-success-100 text-success-700 border-success-200',
      }
    case 'partial':
      return {
        label: 'Teilweise',
        icon: AlertCircle,
        iconClass: 'text-warning-500',
        badgeClass: 'bg-warning-100 text-warning-700 border-warning-200',
      }
    case 'missing':
      return {
        label: 'Fehlt',
        icon: XCircle,
        iconClass: 'text-error-500',
        badgeClass: 'bg-error-100 text-error-700 border-error-200',
      }
  }
}

/**
 * Maps risk level to display configuration
 */
function getRiskConfig(risk: RoleFocusRisk['risk']) {
  switch (risk) {
    case 'gering':
      return {
        label: 'Gering',
        badgeClass: 'bg-success-100 text-success-700 border-success-200',
      }
    case 'mittel':
      return {
        label: 'Mittel',
        badgeClass: 'bg-warning-100 text-warning-700 border-warning-200',
      }
    case 'erhöht':
      return {
        label: 'Erhöht',
        badgeClass: 'bg-error-100 text-error-700 border-error-200',
      }
  }
}

/**
 * Maps match label to display configuration
 */
function getMatchLabelConfig(matchLabel: 'Gute Passung' | 'Teilweise Passung' | 'Stretch-Rolle') {
  switch (matchLabel) {
    case 'Gute Passung':
      return {
        badgeClass: 'bg-success-100 text-success-700 border-success-200',
      }
    case 'Teilweise Passung':
      return {
        badgeClass: 'bg-warning-100 text-warning-700 border-warning-200',
      }
    case 'Stretch-Rolle':
      return {
        badgeClass: 'bg-error-100 text-error-700 border-error-200',
      }
  }
}

/**
 * Skill Requirement Item Component
 */
function SkillRequirementItem({ requirement }: { requirement: SkillRequirementResult }) {
  const statusConfig = getStatusConfig(requirement.status)
  const Icon = statusConfig.icon

  return (
    <li className="flex items-start gap-3 py-2" aria-label={`${requirement.requirement}: ${statusConfig.label}`}>
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', statusConfig.iconClass)} aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-4">
          <span className="text-sm font-medium text-gray-900">{requirement.requirement}</span>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0',
              statusConfig.badgeClass
            )}
            aria-label={`Status: ${statusConfig.label}`}
          >
            {statusConfig.label}
          </span>
        </div>
        {requirement.evidence && (
          <p className="text-xs text-gray-600" aria-label="Beleg">
            {requirement.evidence}
          </p>
        )}
        {requirement.relevance && (
          <p className="text-xs text-gray-500" aria-label={`Relevanz: ${requirement.relevance}`}>
            Relevanz: {requirement.relevance === 'high' ? 'Hoch' : requirement.relevance === 'medium' ? 'Mittel' : 'Niedrig'}
          </p>
        )}
      </div>
    </li>
  )
}

/**
 * Skill Fit Section Component
 */
function SkillFitSection({ skillFit }: { skillFit: AnalysisResult['skillFit'] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="skill-fit">
        <AccordionTrigger className="text-base font-semibold text-gray-900">
          Skill Fit
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pt-4">
          {/* Must-Have Requirements */}
          {skillFit.mustHave && skillFit.mustHave.length > 0 && (
            <div className="space-y-2" aria-label="Must-Have Anforderungen">
              <h4 className="text-sm font-semibold text-gray-900">Must-Have</h4>
              <ul className="space-y-1" role="list">
                {skillFit.mustHave.map((req, index) => (
                  <SkillRequirementItem key={index} requirement={req} />
                ))}
              </ul>
            </div>
          )}

          {/* Nice-to-Have Requirements */}
          {skillFit.niceToHave && skillFit.niceToHave.length > 0 && (
            <div className="space-y-2" aria-label="Nice-to-Have Anforderungen">
              <h4 className="text-sm font-semibold text-gray-900">Nice-to-Have</h4>
              <ul className="space-y-1" role="list">
                {skillFit.niceToHave.map((req, index) => (
                  <SkillRequirementItem key={index} requirement={req} />
                ))}
              </ul>
            </div>
          )}

          {/* Empty State */}
          {(!skillFit.mustHave || skillFit.mustHave.length === 0) &&
            (!skillFit.niceToHave || skillFit.niceToHave.length === 0) && (
              <p className="text-sm text-gray-500">Keine Skill-Anforderungen vorhanden.</p>
            )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

/**
 * Role Focus Risk Section Component
 */
function RoleFocusRiskSection({ roleFocus }: { roleFocus: RoleFocusRisk }) {
  const riskConfig = getRiskConfig(roleFocus.risk)

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="role-focus-risk">
        <AccordionTrigger className="text-base font-semibold text-gray-900">
          <div className="flex items-center gap-3">
            <span>Rollenfokus Risiko</span>
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                riskConfig.badgeClass
              )}
            >
              {riskConfig.label}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Reasons */}
              {roleFocus.reasons && roleFocus.reasons.length > 0 && (
                <div className="space-y-2" aria-label="Risiko-Gründe">
                  <h4 className="text-sm font-semibold text-gray-900">Gründe</h4>
                  <ul className="space-y-2 list-disc list-inside" role="list">
                    {roleFocus.reasons.map((reason, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {roleFocus.recommendations && roleFocus.recommendations.length > 0 && (
                <div className="space-y-2" aria-label="Empfehlungen">
                  <h4 className="text-sm font-semibold text-gray-900">Empfehlungen</h4>
                  <ul className="space-y-2 list-disc list-inside" role="list">
                    {roleFocus.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function ResultsScreen({ result, jobPostingText: propJobPostingText, className }: ResultsScreenProps) {
  const { jobPostingText: contextJobPostingText } = useProfile()
  // Use prop if provided, otherwise fall back to context
  const jobPostingText = propJobPostingText || contextJobPostingText || ''

  if (!result) {
    return (
      <main
        className={cn('container mx-auto max-w-4xl px-4 py-8', className)}
        role="main"
        aria-label="Analyse-Ergebnisse"
      >
        <div className="text-center py-8">
          <p className="text-gray-500">Keine Analyse-Ergebnisse verfügbar.</p>
        </div>
      </main>
    )
  }

  const matchLabelConfig = getMatchLabelConfig(result.summary.matchLabel)

  return (
    <main
      className={cn('container mx-auto max-w-4xl px-4 py-8', className)}
      role="main"
      aria-label="Analyse-Ergebnisse"
    >
      <div className="space-y-6">
        {/* Executive Summary - Always visible */}
        <Card role="region" aria-label="Executive Summary">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl font-bold text-gray-900">Zusammenfassung</CardTitle>
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border',
                  matchLabelConfig.badgeClass
                )}
                aria-label={`Passung: ${result.summary.matchLabel}`}
              >
                {result.summary.matchLabel}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {result.summary.bullets && result.summary.bullets.length > 0 && (
              <ul className="space-y-2 list-disc list-inside" role="list" aria-label="Zusammenfassung Punkte">
                {result.summary.bullets.map((bullet, index) => (
                  <li key={index} className="text-sm text-gray-700 leading-relaxed">
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Skill Fit Section - Collapsible */}
        <SkillFitSection skillFit={result.skillFit} />

        {/* Skill Gaps Section - Collapsible */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="skill-gaps">
            <AccordionTrigger className="text-base font-semibold text-gray-900">
              Skill Lücken
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              {result.gaps && result.gaps.length > 0 ? (
                <div className="space-y-4" role="list" aria-label="Skill Lücken">
                  {result.gaps.map((gap, index) => (
                    <GapActionCard key={index} gap={gap} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Keine Skill-Lücken identifiziert.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* ATS Analysis Section - Collapsible */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ats-analysis">
            <AccordionTrigger className="text-base font-semibold text-gray-900">
              ATS Analyse
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ATSScoreBreakdown ats={result.ats} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Role Focus Risk Section - Collapsible */}
        <RoleFocusRiskSection roleFocus={result.roleFocus} />

        {/* Next Steps Checklist - Always visible */}
        {result.nextSteps && result.nextSteps.length > 0 && (
          <NextStepsChecklist nextSteps={result.nextSteps} />
        )}

        {/* Prompt Export Section - Always last (if enabled) */}
        {ENABLE_PROMPT_EXPORT && (
          <PromptExportSection
            analysisResult={result}
            jobPostingText={jobPostingText}
          />
        )}
      </div>
    </main>
  )
}

/**
 * Type definition for location state passed from LoadingScreen
 */
interface AnalysisResultLocationState {
  analysisResult: AnalysisResult
}

/**
 * Default export for routing compatibility.
 * Reads analysis results from AnalysisContext (with fallback to location.state for backward compatibility)
 * and passes to ResultsScreen component.
 */
export default function ResultsScreenDefault() {
  const location = useLocation()
  const navigate = useNavigate()
  const { analysisResult: contextAnalysisResult } = useAnalysis()
  const { jobPostingText: contextJobPostingText } = useProfile()
  const state = location.state as AnalysisResultLocationState | null

  // Get analysis result from context (with fallback to location.state for backward compatibility)
  const analysisResult = contextAnalysisResult || state?.analysisResult || null

  // Handle missing analysis results
  if (!analysisResult) {
    return (
      <main
        className="container mx-auto max-w-4xl px-4 py-8"
        role="main"
        aria-label="Analyse-Ergebnisse"
      >
        <Card role="alert" aria-live="polite">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Keine Analyse-Ergebnisse verfügbar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Es wurden keine Analyse-Ergebnisse gefunden. Bitte starten Sie eine neue Analyse.
            </p>
            <Button
              onClick={() => navigate('/input')}
              className="w-full sm:w-auto"
              aria-label="Zur Eingabeseite zurückkehren"
            >
              Zur Eingabeseite zurückkehren
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return <ResultsScreen result={analysisResult} jobPostingText={contextJobPostingText} />
}
