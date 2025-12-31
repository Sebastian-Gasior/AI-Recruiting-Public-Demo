import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export interface PrivacyNoticeProps {
  variant?: 'landing' | 'input'
  showCheckbox?: boolean
  checkboxChecked?: boolean
  onCheckboxChange?: (checked: boolean) => void
  className?: string
}

export function PrivacyNotice({
  variant = 'landing',
  showCheckbox = false,
  checkboxChecked = false,
  onCheckboxChange,
  className,
}: PrivacyNoticeProps) {
  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      onCheckboxChange?.(checked)
    }
  }

  const content = (
    <>
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Privacy-First</h2>
          <div className="space-y-1.5 text-sm text-gray-700">
            <p>Ihre Daten verlassen nie Ihr Gerät.</p>
            <p>100% lokale Verarbeitung im Browser.</p>
            <p>Keine Datenübertragung an Server.</p>
          </div>
        </div>
      </div>
      {showCheckbox && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          <Checkbox
            id="privacy-understood"
            checked={checkboxChecked}
            onCheckedChange={handleCheckboxChange}
          />
          <label htmlFor="privacy-understood" className="text-sm text-gray-700 cursor-pointer">
            Ich habe verstanden, dass meine Daten lokal verarbeitet werden
          </label>
        </div>
      )}
    </>
  )

  if (variant === 'input') {
    return (
      <Card
        role="region"
        aria-label="Privacy Notice"
        lang="de"
        className={cn('border-primary-200 bg-primary-50/50', className)}
      >
        <CardContent className="pt-6">
          <article>{content}</article>
        </CardContent>
      </Card>
    )
  }

  return (
    <article
      role="region"
      aria-label="Privacy Notice"
      lang="de"
      className={cn(
        'rounded-lg border-2 border-primary-600 bg-primary-50 p-8 shadow-sm',
        className
      )}
    >
      {content}
    </article>
  )
}
