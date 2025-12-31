/**
 * Analysis-related TypeScript type definitions
 * Based on PRD data model requirements
 */

import type { Profile } from './profile.types'

export interface AnalysisInput {
  profile: Profile
  jobPostingText: string
}

export interface SkillRequirementResult {
  requirement: string
  status: 'met' | 'partial' | 'missing'
  evidence?: string // Short evidence string for match
  relevance?: 'high' | 'medium' | 'low' // Relevance level
}

export interface GapActionCard {
  requirement: string
  relevance: 'high' | 'medium' | 'low'
  status: 'partial' | 'missing'
  recommendedAction: 'rephrase' | 'evidence' | 'learn' | 'ignore'
  suggestionType?: string // Additional suggestion context
}

export interface ATSScoreBreakdown {
  structure: number // 0-100
  coverage: number // 0-100
  placement: number // 0-100
  context: number // 0-100
}

export interface ATSAnalysis {
  score: number // 0-100 (overall ATS score)
  breakdown: ATSScoreBreakdown
  todos: string[] // Actionable ATS optimization suggestions
}

export interface RoleFocusRisk {
  risk: 'gering' | 'mittel' | 'erhöht'
  reasons: string[] // Reasons for risk assessment
  recommendations: string[] // Recommendations to address risk
}

export interface ExecutiveSummary {
  matchLabel: 'Gute Passung' | 'Teilweise Passung' | 'Stretch-Rolle'
  bullets: string[] // 2-3 bullet points summarizing key insights
}

export interface AnalysisResult {
  summary: ExecutiveSummary
  skillFit: {
    mustHave: SkillRequirementResult[]
    niceToHave: SkillRequirementResult[]
  }
  gaps: GapActionCard[]
  ats: ATSAnalysis
  roleFocus: RoleFocusRisk
  nextSteps: string[] // Prioritized next steps checklist
}
