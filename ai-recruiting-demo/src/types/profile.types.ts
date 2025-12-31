/**
 * Profile-related TypeScript type definitions
 * Based on PRD data model requirements
 */

export interface ExperienceItem {
  employer: string
  role: string
  startDate: string // MM/YYYY format
  endDate: string | 'current' // MM/YYYY format or "current"
  description: string
}

export interface EducationItem {
  degree?: string
  institution?: string
  startDate?: string // MM/YYYY format (optional)
  endDate?: string // MM/YYYY format (optional)
  notes?: string
}

export interface Profile {
  id: string // UUID
  name: string
  createdAt: string // ISO 8601 datetime string
  updatedAt: string // ISO 8601 datetime string
  data: {
    profileSummary?: string // Optional profile summary text
    experiences: ExperienceItem[]
    education: EducationItem[]
    skills: string // Skills text
    projects?: string // Optional projects/responsibilities text
  }
}
