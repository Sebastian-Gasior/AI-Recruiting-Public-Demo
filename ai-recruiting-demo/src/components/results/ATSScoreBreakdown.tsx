import React from 'react'
import type { ATSAnalysis } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ATSScoreBreakdownProps {
  ats: ATSAnalysis
  className?: string
}

/**
 * Maps score value to color configuration for visual feedback
 */
function getScoreColorConfig(score: number) {
  if (score < 50) {
    return {
      bgClass: 'bg-error-500',
      textClass: 'text-error-500',
      bgLightClass: 'bg-error-100',
      textDarkClass: 'text-gray-900',
    }
  } else if (score < 70) {
    return {
      bgClass: 'bg-warning-500',
      textClass: 'text-warning-500',
      bgLightClass: 'bg-warning-100',
      textDarkClass: 'text-gray-900',
    }
  } else {
    return {
      bgClass: 'bg-success-500',
      textClass: 'text-success-500',
      bgLightClass: 'bg-success-100',
      textDarkClass: 'text-gray-900',
    }
  }
}

/**
 * Maps breakdown score label to German display text
 */
function getBreakdownLabel(key: keyof ATSAnalysis['breakdown']): string {
  switch (key) {
    case 'structure':
      return 'Struktur'
    case 'coverage':
      return 'Abdeckung'
    case 'placement':
      return 'Platzierung'
    case 'context':
      return 'Kontext'
    default:
      return key
  }
}

/**
 * Progress bar component for displaying breakdown scores
 */
function BreakdownProgressBar({
  label,
  score,
  scoreId,
}: {
  label: string
  score: number
  scoreId: string
}) {
  const colorConfig = getScoreColorConfig(score)
  const progressId = `progress-${scoreId}`
  const labelId = `label-${scoreId}`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          id={labelId}
          className="text-sm font-medium text-gray-700"
          aria-label={`${label} Score`}
        >
          {label}
        </span>
        <span
          className={cn('text-sm font-semibold', colorConfig.textClass)}
          aria-label={`${label}: ${score} von 100`}
        >
          {score}
        </span>
      </div>
      <div
        role="progressbar"
        id={progressId}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby={labelId}
        aria-label={`${label} Score: ${score} von 100`}
        className="h-2 w-full bg-gray-200 rounded-full overflow-hidden"
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', colorConfig.bgClass)}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export function ATSScoreBreakdown({ ats, className }: ATSScoreBreakdownProps) {
  const overallColorConfig = getScoreColorConfig(ats.score)

  return (
    <Card
      className={cn('relative', className)}
      role="article"
      aria-label="ATS Score Breakdown"
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          ATS Score
        </CardTitle>
        <div className="flex items-center gap-4 mt-4">
          <div
            className={cn(
              'text-5xl font-bold',
              overallColorConfig.textClass
            )}
            aria-label={`Gesamt ATS Score: ${ats.score} von 100`}
          >
            {ats.score}
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">
              von 100 Punkten
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {ats.score < 50
                ? 'Optimierungsbedarf'
                : ats.score < 70
                  ? 'Verbesserung möglich'
                  : 'Gut optimiert'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Breakdown Scores */}
        <div className="space-y-4" aria-label="Score Aufschlüsselung">
          <h3 className="text-sm font-semibold text-gray-900">
            Aufschlüsselung
          </h3>
          <div className="space-y-4">
            {(Object.keys(ats.breakdown) as Array<keyof ATSAnalysis['breakdown']>).map(
              (key) => (
                <BreakdownProgressBar
                  key={key}
                  label={getBreakdownLabel(key)}
                  score={ats.breakdown[key]}
                  scoreId={key}
                />
              )
            )}
          </div>
        </div>

        {/* Todos List */}
        {ats.todos && ats.todos.length > 0 && (
          <div className="space-y-2" aria-label="Optimierungsvorschläge">
            <h3 className="text-sm font-semibold text-gray-900">
              Optimierungsvorschläge
            </h3>
            <ul className="space-y-2 list-disc list-inside">
              {ats.todos.map((todo, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 leading-relaxed"
                  aria-label={`Vorschlag ${index + 1}: ${todo}`}
                >
                  {todo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

