/**
 * Common TypeScript type definitions
 * Shared types used across the application
 */

// ID type (UUID string)
export type ProfileId = string

// Timestamp type (ISO 8601 datetime string)
export type Timestamp = string

// Hash type (for result caching)
export type AnalysisHash = string

// Status types
export type MatchStatus = 'met' | 'partial' | 'missing'
export type RelevanceLevel = 'high' | 'medium' | 'low'
export type RiskLevel = 'gering' | 'mittel' | 'erhöht'
export type MatchLabel = 'Gute Passung' | 'Teilweise Passung' | 'Stretch-Rolle'
export type GapAction = 'rephrase' | 'evidence' | 'learn' | 'ignore'

// Date format (MM/YYYY)
export type MonthYear = string // Format: "MM/YYYY"

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
