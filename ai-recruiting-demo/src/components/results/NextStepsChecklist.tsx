import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface NextStepsChecklistProps {
  nextSteps: string[]
  className?: string
}

export function NextStepsChecklist({ nextSteps, className }: NextStepsChecklistProps) {
  // Component is always visible (not collapsible) as per PRD requirement
  if (!nextSteps || nextSteps.length === 0) {
    return null
  }

  return (
    <Card
      className={cn('relative', className)}
      role="region"
      aria-label="Nächste Schritte Checkliste"
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Nächste Schritte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul
          className="space-y-3"
          role="list"
          aria-label="Priorisierte nächste Schritte"
        >
          {nextSteps.map((step, index) => (
            <li
              key={index}
              className="flex items-start gap-3"
              aria-label={`Schritt ${index + 1}: ${step}`}
            >
              <CheckCircle2
                className="h-5 w-5 text-success-500 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span className="text-sm text-gray-700 leading-relaxed flex-1">
                {step}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

