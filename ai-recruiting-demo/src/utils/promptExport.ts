/**
 * Prompt Export Utility
 * 
 * Generates curated prompts for external LLMs (e.g., cover letter generation).
 * 
 * This utility creates prompts that:
 * - Include role title from job posting
 * - Highlight curated strengths (top met items with evidence)
 * - Address top gaps carefully
 * - Apply exclusions (no leadership/strategy if not required, no salary, no invented skills)
 * - Do NOT include full CV or full job posting (Privacy-First principle)
 * 
 * **Privacy Considerations:**
 * - Prompts are designed for external LLM providers
 * - Users must be warned about data sharing with external providers
 * - No full profile data is included in prompts
 * 
 * @module utils/promptExport
 */

import type { AnalysisResult } from '@/types/analysis.types'

/**
 * Extracts role title from job posting text.
 * 
 * Simple heuristic: Takes first line of job posting text
 * and extracts potential role title (max 100 chars).
 * 
 * This ensures we don't include too much of the job posting
 * in the prompt (Privacy-First principle).
 * 
 * @param jobPostingText - Full job posting text
 * @returns Extracted role title or fallback text
 */
function extractRoleTitle(jobPostingText: string): string {
  if (!jobPostingText || jobPostingText.trim().length === 0) {
    return 'Stellenausschreibung'
  }

  // Take first non-empty line only (to avoid including too much text)
  const firstLine = jobPostingText
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0)

  if (!firstLine) {
    return 'Stellenausschreibung'
  }

  // Limit to 100 chars to avoid too long titles
  return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine
}

/**
 * Checks if job requirements mention leadership or strategy terms.
 * 
 * Used to determine if leadership/strategy should be excluded from prompt.
 * 
 * Note: This function looks for positive requirements (e.g., "leadership required"),
 * not negative statements (e.g., "no leadership needed").
 * 
 * @param jobPostingText - Full job posting text
 * @returns true if leadership/strategy terms are found as requirements, false otherwise
 */
function hasLeadershipOrStrategyRequirements(jobPostingText: string): boolean {
  if (!jobPostingText || jobPostingText.trim().length === 0) {
    return false
  }

  const text = jobPostingText.toLowerCase()
  
  // Negative indicators that suggest leadership is NOT required
  const negativeIndicators = [
    'keine führung',
    'keine leadership',
    'keine strategie',
    'no leadership',
    'no strategy',
    'nicht erforderlich',
    'not required',
  ]
  
  // If negative indicators are present, leadership is NOT required
  if (negativeIndicators.some(indicator => text.includes(indicator))) {
    return false
  }

  // Positive leadership/strategy terms
  const leadershipTerms = [
    'leadership',
    'führung',
    'führen',
    'teamleitung',
    'team lead',
    'manager',
    'management',
    'strategie',
    'strategy',
    'strategisch',
    'strategic',
    'leitend',
    'leading',
  ]

  return leadershipTerms.some(term => text.includes(term))
}

/**
 * Generates curated cover letter prompt for external LLMs.
 * 
 * This function creates a structured prompt that includes:
 * - Role title (extracted from job posting)
 * - Curated strengths (top 3-5 met items with evidence)
 * - Top 1-2 gaps addressed carefully
 * - Tone and exclusions guidance
 * 
 * **Exclusions Applied:**
 * - No leadership/strategy mentions if not in job requirements
 * - No salary mentions
 * - No invented skills
 * - No full CV or full job posting
 * 
 * @param analysisResult - Analysis result from Analysis Engine
 * @param jobPostingText - Full job posting text (for role title extraction and exclusions)
 * @returns Formatted prompt string ready for external LLM
 * 
 * @example
 * ```typescript
 * const prompt = generateCoverLetterPrompt(analysisResult, jobPostingText)
 * // Returns formatted prompt string
 * ```
 */
export function generateCoverLetterPrompt(
  analysisResult: AnalysisResult,
  jobPostingText: string
): string {
  if (!analysisResult) {
    return 'Keine Analyse-Ergebnisse verfügbar.'
  }

  // Extract role title
  const roleTitle = extractRoleTitle(jobPostingText)

  // Extract curated strengths (top 3-5 met items with evidence)
  const metItems = analysisResult.skillFit.mustHave.filter(
    item => item.status === 'met'
  )
  const topStrengths = metItems
    .slice(0, 5) // Take top 5
    .map(item => {
      const evidence = item.evidence ? ` (${item.evidence})` : ''
      return `- ${item.requirement}${evidence}`
    })

  // Extract top 1-2 gaps (prioritize high relevance, missing status)
  const missingGaps = analysisResult.gaps.filter(
    gap => gap.status === 'missing' && gap.relevance === 'high'
  )
  const topGaps = missingGaps.slice(0, 2).map(gap => gap.requirement)

  // Check exclusions
  const hasLeadershipStrategy = hasLeadershipOrStrategyRequirements(jobPostingText)

  // Build prompt sections
  const sections: string[] = []

  // Role title section
  sections.push(`**Rolle:** ${roleTitle}`)
  sections.push('')

  // Strengths section
  if (topStrengths.length > 0) {
    sections.push('**Stärken (Top Passungen):**')
    sections.push(...topStrengths)
    sections.push('')
  }

  // Gaps section (if any)
  if (topGaps.length > 0) {
    sections.push('**Wichtige Lücken (beim Anschreiben berücksichtigen):**')
    topGaps.forEach(gap => {
      sections.push(`- ${gap}`)
    })
    sections.push('')
  }

  // Tone and exclusions section
  sections.push('**Hinweise für Anschreiben:**')
  sections.push('- Professioneller, präziser Ton')
  sections.push('- Keine Gehaltsangaben erwähnen')
  sections.push('- Keine erfundenen Fähigkeiten angeben')

  if (!hasLeadershipStrategy) {
    sections.push('- Keine Führungs- oder Strategieerfahrung erwähnen (nicht in Anforderungen)')
  }

  sections.push('')
  sections.push('**Bitte erstellen Sie ein Anschreiben basierend auf diesen Informationen.**')

  return sections.join('\n')
}

