import React from 'react'
import type { GapActionCard } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface GapActionCardProps {
  gap: GapActionCard
  className?: string
}

/**
 * Maps relevance level to display text and styling classes
 */
function getRelevanceConfig(relevance: 'high' | 'medium' | 'low') {
  switch (relevance) {
    case 'high':
      return {
        label: 'Hohe Relevanz',
        badgeClass: 'bg-primary-100 text-primary-700 border-primary-200',
      }
    case 'medium':
      return {
        label: 'Mittlere Relevanz',
        badgeClass: 'bg-warning-100 text-warning-700 border-warning-200',
      }
    case 'low':
      return {
        label: 'Niedrige Relevanz',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      }
  }
}

/**
 * Maps status to display text and styling classes
 */
function getStatusConfig(status: 'partial' | 'missing') {
  switch (status) {
    case 'partial':
      return {
        label: 'Teilweise vorhanden',
        badgeClass: 'bg-info-100 text-info-700 border-info-200',
      }
    case 'missing':
      return {
        label: 'Fehlt',
        badgeClass: 'bg-error-100 text-error-700 border-error-200',
      }
  }
}

/**
 * Maps recommended action to display text and styling classes
 */
function getActionConfig(action: 'rephrase' | 'evidence' | 'learn' | 'ignore') {
  switch (action) {
    case 'rephrase':
      return {
        label: 'Umformulieren',
        description: 'Formulieren Sie Ihre vorhandenen Skills anders',
        badgeClass: 'bg-primary-50 text-primary-700 border-primary-600 font-semibold',
      }
    case 'evidence':
      return {
        label: 'Belege hinzufügen',
        description: 'Fügen Sie konkrete Beispiele oder Projekte hinzu',
        badgeClass: 'bg-success-100 text-success-700 border-success-500 font-semibold',
      }
    case 'learn':
      return {
        label: 'Erlernen',
        description: 'Erlernen Sie diese Fähigkeit vor der Bewerbung',
        badgeClass: 'bg-warning-100 text-warning-700 border-warning-500 font-semibold',
      }
    case 'ignore':
      return {
        label: 'Ignorieren',
        description: 'Diese Anforderung kann ignoriert werden',
        badgeClass: 'bg-gray-100 text-gray-600 border-gray-300 font-normal',
      }
  }
}

export function GapActionCard({ gap, className }: GapActionCardProps) {
  const relevanceConfig = getRelevanceConfig(gap.relevance)
  const statusConfig = getStatusConfig(gap.status)
  const actionConfig = getActionConfig(gap.recommendedAction)

  const cardId = `gap-action-card-${gap.requirement.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`

  return (
    <Card
      className={cn('relative', className)}
      role="article"
      aria-label={`Skill Gap: ${gap.requirement}`}
      id={cardId}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex-1">
            {gap.requirement}
          </CardTitle>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                relevanceConfig.badgeClass
              )}
              aria-label={`Relevanz: ${relevanceConfig.label}`}
            >
              {relevanceConfig.label}
            </span>
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                statusConfig.badgeClass
              )}
              aria-label={`Status: ${statusConfig.label}`}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-md text-sm border-2',
              actionConfig.badgeClass
            )}
            role="status"
            aria-label={`Empfohlene Aktion: ${actionConfig.label}`}
          >
            <span className="font-semibold mr-2">{actionConfig.label}:</span>
            <span>{actionConfig.description}</span>
          </div>
          {gap.suggestionType && (
            <p className="text-sm text-gray-600" aria-label="Zusätzliche Hinweise">
              {gap.suggestionType}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

