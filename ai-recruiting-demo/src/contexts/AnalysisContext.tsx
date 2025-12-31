import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react'
import type { AnalysisResult } from '@/types/analysis.types'

/**
 * Analysis Context Type Definition
 * 
 * Provides global state for current analysis results
 * across all screens in the application.
 */
interface AnalysisContextType {
  analysisResult: AnalysisResult | null
  setAnalysisResult: (result: AnalysisResult) => void
  clearAnalysisResult: () => void
}

/**
 * Analysis Context
 * 
 * Context for managing global analysis results state.
 * Use useAnalysis() hook to consume this context.
 */
const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

/**
 * Analysis Provider Props
 */
interface AnalysisProviderProps {
  children: ReactNode
}

/**
 * Analysis Provider Component
 * 
 * Provides global analysis results state to all child components.
 * Manages current analysis result using React State.
 * 
 * **State Management:**
 * - Uses useState for state management (as per Architecture)
 * - Implements immutable update patterns
 * - Provides cleanup function (clearAnalysisResult)
 * 
 * @component
 */
export function AnalysisProvider({ children }: AnalysisProviderProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  /**
   * Set analysis result (immutable update)
   */
  const handleSetAnalysisResult = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result)
  }, [])

  /**
   * Clear analysis result (cleanup)
   */
  const clearAnalysisResult = useCallback(() => {
    setAnalysisResult(null)
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  // Functions are already memoized with useCallback, so they're stable
  const value: AnalysisContextType = useMemo(
    () => ({
      analysisResult,
      setAnalysisResult: handleSetAnalysisResult,
      clearAnalysisResult,
    }),
    [analysisResult, handleSetAnalysisResult, clearAnalysisResult]
  )

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
}

/**
 * useAnalysis Hook
 * 
 * Custom hook for consuming AnalysisContext.
 * 
 * **Usage:**
 * ```tsx
 * const { analysisResult, setAnalysisResult, clearAnalysisResult } = useAnalysis()
 * ```
 * 
 * **Error Handling:**
 * Throws error if used outside AnalysisProvider.
 * 
 * @returns AnalysisContextType
 * @throws Error if used outside AnalysisProvider
 */
export function useAnalysis(): AnalysisContextType {
  const context = useContext(AnalysisContext)
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return context
}

