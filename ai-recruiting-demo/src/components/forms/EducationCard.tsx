import React from 'react'
import type { EducationItem } from '@/types/profile.types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

export interface EducationCardProps {
  education: EducationItem
  onChange: (education: EducationItem) => void
  onRemove: () => void
  index: number
  className?: string
}

const DATE_FORMAT_REGEX = /^(0[1-9]|1[0-2])\/\d{4}$/

function validateDate(date: string | undefined): boolean {
  if (!date || date.trim() === '') return true // Optional field
  return DATE_FORMAT_REGEX.test(date)
}

export function EducationCard({
  education,
  onChange,
  onRemove,
  index,
  className,
}: EducationCardProps) {
  const [dateErrors, setDateErrors] = React.useState<{
    startDate?: string
    endDate?: string
  }>({})

  const handleFieldChange = (field: keyof EducationItem, value: string) => {
    const updated = { ...education, [field]: value || undefined }
    onChange(updated)

    // Validate dates on change (only if provided)
    if (field === 'startDate') {
      if (value && value.trim() !== '' && !validateDate(value)) {
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
      if (value && value.trim() !== '' && !validateDate(value)) {
        setDateErrors((prev) => ({
          ...prev,
          endDate: 'Bitte verwenden Sie das Format MM/YYYY',
        }))
      } else {
        setDateErrors((prev) => {
          const { endDate, ...rest } = prev
          return rest
        })
      }
    }
  }

  const cardId = `education-card-${index}`
  const degreeId = `${cardId}-degree`
  const institutionId = `${cardId}-institution`
  const startDateId = `${cardId}-start-date`
  const endDateId = `${cardId}-end-date`
  const notesId = `${cardId}-notes`

  return (
    <Card
      className={cn('relative', className)}
      role="group"
      aria-label={`Education Entry ${index + 1}`}
    >
      <CardContent className="p-6 space-y-4">
        {/* Remove Button */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            aria-label={`Remove Education Entry ${index + 1}`}
            className="min-h-[44px] min-w-[44px]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Degree Field */}
        <div className="space-y-2">
          <label
            htmlFor={degreeId}
            className="text-sm font-medium text-gray-900"
          >
            Abschluss (optional)
          </label>
          <Input
            id={degreeId}
            type="text"
            value={education.degree || ''}
            onChange={(e) => handleFieldChange('degree', e.target.value)}
            placeholder="z.B. Bachelor of Science"
            className="w-full"
          />
        </div>

        {/* Institution Field */}
        <div className="space-y-2">
          <label
            htmlFor={institutionId}
            className="text-sm font-medium text-gray-900"
          >
            Institution (optional)
          </label>
          <Input
            id={institutionId}
            type="text"
            value={education.institution || ''}
            onChange={(e) => handleFieldChange('institution', e.target.value)}
            placeholder="z.B. Universität München"
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
              Startdatum (optional)
            </label>
            <Input
              id={startDateId}
              type="text"
              value={education.startDate || ''}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              placeholder="MM/YYYY"
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
              Enddatum (optional)
            </label>
            <Input
              id={endDateId}
              type="text"
              value={education.endDate || ''}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              placeholder="MM/YYYY"
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

        {/* Notes Field */}
        <div className="space-y-2">
          <label
            htmlFor={notesId}
            className="text-sm font-medium text-gray-900"
          >
            Notizen (optional)
          </label>
          <Textarea
            id={notesId}
            value={education.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Zusätzliche Informationen zur Ausbildung..."
            rows={3}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}

