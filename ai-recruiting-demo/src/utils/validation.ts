/**
 * Input validation utilities for enforcing character limits
 * Based on PRD requirements (FR8, FR9, NFR8)
 */

import type { Profile } from '@/types/profile.types'

/**
 * Character limits for validation
 */
export const CHAR_LIMITS = {
  TOTAL_PROFILE: 40000,
  JOB_TEXT: 25000,
  SINGLE_TEXTAREA: 10000,
} as const

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Calculate total profile text length
 * Includes: profileSummary, all experience descriptions, all education notes, skills, projects
 */
function calculateTotalProfileTextLength(profile: Profile): number {
  let total = 0

  // Profile Summary
  if (profile.data.profileSummary) {
    total += profile.data.profileSummary.length
  }

  // All experience descriptions
  if (profile.data.experiences) {
    total += profile.data.experiences.reduce(
      (sum, exp) => sum + (exp.description?.length || 0),
      0
    )
  }

  // All education notes
  if (profile.data.education) {
    total += profile.data.education.reduce(
      (sum, edu) => sum + (edu.notes?.length || 0),
      0
    )
  }

  // Skills
  if (profile.data.skills) {
    total += profile.data.skills.length
  }

  // Projects
  if (profile.data.projects) {
    total += profile.data.projects.length
  }

  return total
}

/**
 * Validate total profile text length
 * Returns validation result with error message if limit exceeded
 */
export function validateTotalProfileText(profile: Profile): ValidationResult {
  const totalLength = calculateTotalProfileTextLength(profile)
  const limit = CHAR_LIMITS.TOTAL_PROFILE

  if (totalLength > limit) {
    const excess = totalLength - limit
    return {
      valid: false,
      errors: [
        `Das Gesamtprofil überschreitet das Limit von ${limit.toLocaleString('de-DE')} Zeichen. Aktuell: ${totalLength.toLocaleString('de-DE')} Zeichen. Bitte kürzen Sie um ${excess.toLocaleString('de-DE')} Zeichen.`,
      ],
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Validate job posting text length
 * Returns validation result with error message if limit exceeded
 */
export function validateJobText(jobText: string): ValidationResult {
  const length = jobText?.length || 0
  const limit = CHAR_LIMITS.JOB_TEXT

  if (length > limit) {
    const excess = length - limit
    return {
      valid: false,
      errors: [
        `Die Stellenausschreibung überschreitet das Limit von ${limit.toLocaleString('de-DE')} Zeichen. Aktuell: ${length.toLocaleString('de-DE')} Zeichen. Bitte kürzen Sie um ${excess.toLocaleString('de-DE')} Zeichen.`,
      ],
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Validate single textarea field length
 * Returns validation result with error message if limit exceeded
 */
export function validateSingleTextarea(
  text: string,
  fieldName: string
): ValidationResult {
  const length = text?.length || 0
  const limit = CHAR_LIMITS.SINGLE_TEXTAREA

  if (length > limit) {
    const excess = length - limit
    return {
      valid: false,
      errors: [
        `Das Feld "${fieldName}" überschreitet das Limit von ${limit.toLocaleString('de-DE')} Zeichen. Aktuell: ${length.toLocaleString('de-DE')} Zeichen. Bitte kürzen Sie um ${excess.toLocaleString('de-DE')} Zeichen.`,
      ],
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Validate all single textarea fields in profile
 * Returns validation result with all errors
 */
function validateAllSingleTextareas(profile: Profile): ValidationResult {
  const errors: string[] = []

  // Validate Profile Summary
  if (profile.data.profileSummary) {
    const result = validateSingleTextarea(
      profile.data.profileSummary,
      'Profile Summary'
    )
    if (!result.valid) {
      errors.push(...result.errors)
    }
  }

  // Validate Skills
  if (profile.data.skills) {
    const result = validateSingleTextarea(profile.data.skills, 'Skills')
    if (!result.valid) {
      errors.push(...result.errors)
    }
  }

  // Validate Projects
  if (profile.data.projects) {
    const result = validateSingleTextarea(profile.data.projects, 'Projects')
    if (!result.valid) {
      errors.push(...result.errors)
    }
  }

  // Validate all experience descriptions
  if (profile.data.experiences) {
    profile.data.experiences.forEach((exp, index) => {
      if (exp.description) {
        const result = validateSingleTextarea(
          exp.description,
          `Arbeitserfahrung ${index + 1} - Beschreibung`
        )
        if (!result.valid) {
          errors.push(...result.errors)
        }
      }
    })
  }

  // Validate all education notes
  if (profile.data.education) {
    profile.data.education.forEach((edu, index) => {
      if (edu.notes) {
        const result = validateSingleTextarea(
          edu.notes,
          `Ausbildung ${index + 1} - Notizen`
        )
        if (!result.valid) {
          errors.push(...result.errors)
        }
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Comprehensive validation function
 * Validates all limits: total profile, job text, single textareas
 * Returns aggregated validation results
 */
export function validateProfileData(
  profile: Profile,
  jobText: string
): ValidationResult {
  const errors: string[] = []

  // Validate total profile text
  const totalProfileResult = validateTotalProfileText(profile)
  if (!totalProfileResult.valid) {
    errors.push(...totalProfileResult.errors)
  }

  // Validate job text
  const jobTextResult = validateJobText(jobText)
  if (!jobTextResult.valid) {
    errors.push(...jobTextResult.errors)
  }

  // Validate all single textareas
  const singleTextareasResult = validateAllSingleTextareas(profile)
  if (!singleTextareasResult.valid) {
    errors.push(...singleTextareasResult.errors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

