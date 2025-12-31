import React from 'react'
import type { ExperienceItem } from '@/types/profile.types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

export interface ExperienceCardProps {
  experience: ExperienceItem
  onChange: (experience: ExperienceItem) => void
  onRemove: () => void
  index: number
  className?: string
}

const DATE_FORMAT_REGEX = /^(0[1-9]|1[0-2])\/\d{4}$/

function validateDate(date: string): boolean {
  if (date === 'current') return true
  return DATE_FORMAT_REGEX.test(date)
}

export function ExperienceCard({
  experience,
  onChange,
  onRemove,
  index,
  className,
}: ExperienceCardProps) {
  const [dateErrors, setDateErrors] = React.useState<{
    startDate?: string
    endDate?: string
  }>({})

  const handleFieldChange = (field: keyof ExperienceItem, value: string) => {
    const updated = { ...experience, [field]: value }
    onChange(updated)

    // Validate dates on change
    if (field === 'startDate') {
      if (value && !validateDate(value)) {
        setDateErrors((prev) => ({
          ...prev,
          startDate: 'Bitte verwenden Sie das Format MM/YYYY',
        }))
      } else {
        setDateErrors((prev) => {
          const { startDate, ...rest } = prev
          return rest
        })
      }
    }

    if (field === 'endDate') {
      if (value && value !== 'current' && !validateDate(value)) {
        setDateErrors((prev) => ({
          ...prev,
          endDate: 'Bitte verwenden Sie das Format MM/YYYY oder "current"',
        }))
      } else {
        setDateErrors((prev) => {
          const { endDate, ...rest } = prev
          return rest
        })
      }
    }
  }

  const cardId = `experience-card-${index}`
  const employerId = `${cardId}-employer`
  const roleId = `${cardId}-role`
  const startDateId = `${cardId}-start-date`
  const endDateId = `${cardId}-end-date`
  const descriptionId = `${cardId}-description`

  return (
    <Card
      className={cn('relative', className)}
      role="group"
      aria-label={`Work Experience Entry ${index + 1}`}
    >
      <CardContent className="p-6 space-y-4">
        {/* Remove Button */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            aria-label={`Remove Experience Entry ${index + 1}`}
            className="min-h-[44px] min-w-[44px]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Employer Field */}
        <div className="space-y-2">
          <label
            htmlFor={employerId}
            className="text-sm font-medium text-gray-900"
          >
            Arbeitgeber *
          </label>
          <Input
            id={employerId}
            type="text"
            value={experience.employer}
            onChange={(e) => handleFieldChange('employer', e.target.value)}
            placeholder="z.B. Tech Company GmbH"
            aria-required="true"
            className="w-full"
          />
        </div>

        {/* Role Field */}
        <div className="space-y-2">
          <label htmlFor={roleId} className="text-sm font-medium text-gray-900">
            Position *
          </label>
          <Input
            id={roleId}
            type="text"
            value={experience.role}
            onChange={(e) => handleFieldChange('role', e.target.value)}
            placeholder="z.B. Senior Software Engineer"
            aria-required="true"
            className="w-full"
          />
        </div>

        {/* Date Fields Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date Field */}
          <div className="space-y-2">
            <label
              htmlFor={startDateId}
              className="text-sm font-medium text-gray-900"
            >
              Startdatum *
            </label>
            <Input
              id={startDateId}
              type="text"
              value={experience.startDate}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              placeholder="MM/YYYY"
              aria-required="true"
              aria-describedby={
                dateErrors.startDate ? `${startDateId}-error` : undefined
              }
              aria-invalid={!!dateErrors.startDate}
              className={cn(
                'w-full',
                dateErrors.startDate && 'border-red-500 focus-visible:ring-red-500'
              )}
            />
            {dateErrors.startDate && (
              <p
                id={`${startDateId}-error`}
                className="text-sm text-red-600"
                role="alert"
              >
                {dateErrors.startDate}
              </p>
            )}
          </div>

          {/* End Date Field */}
          <div className="space-y-2">
            <label
              htmlFor={endDateId}
              className="text-sm font-medium text-gray-900"
            >
              Enddatum *
            </label>
            <Input
              id={endDateId}
              type="text"
              value={experience.endDate}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              placeholder="MM/YYYY oder 'current'"
              aria-required="true"
              aria-describedby={
                dateErrors.endDate ? `${endDateId}-error` : undefined
              }
              aria-invalid={!!dateErrors.endDate}
              className={cn(
                'w-full',
                dateErrors.endDate && 'border-red-500 focus-visible:ring-red-500'
              )}
            />
            {dateErrors.endDate && (
              <p
                id={`${endDateId}-error`}
                className="text-sm text-red-600"
                role="alert"
              >
                {dateErrors.endDate}
              </p>
            )}
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <label
            htmlFor={descriptionId}
            className="text-sm font-medium text-gray-900"
          >
            Beschreibung *
          </label>
          <Textarea
            id={descriptionId}
            value={experience.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Beschreiben Sie Ihre Aufgaben und Verantwortlichkeiten..."
            rows={4}
            aria-required="true"
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}

