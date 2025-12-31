import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react'
import type { Profile } from '@/types/profile.types'

/**
 * Profile Context Type Definition
 * 
 * Provides global state for current profile and job posting text
 * across all screens in the application.
 */
interface ProfileContextType {
  profile: Profile | null
  jobPostingText: string
  updateProfile: (profile: Profile) => void
  updateJobPostingText: (text: string) => void
  clearProfile: () => void
}

/**
 * Profile Context
 * 
 * Context for managing global profile state.
 * Use useProfile() hook to consume this context.
 */
const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

/**
 * Profile Provider Props
 */
interface ProfileProviderProps {
  children: ReactNode
}

/**
 * Profile Provider Component
 * 
 * Provides global profile state to all child components.
 * Manages current profile and job posting text using React State.
 * 
 * **State Management:**
 * - Uses useState for state management (as per Architecture)
 * - Implements immutable update patterns
 * - Provides cleanup function (clearProfile)
 * 
 * @component
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [jobPostingText, setJobPostingText] = useState<string>('')

  /**
   * Update profile state (immutable update)
   */
  const updateProfile = useCallback((newProfile: Profile) => {
    setProfile(newProfile)
  }, [])

  /**
   * Update job posting text state
   */
  const updateJobPostingText = useCallback((text: string) => {
    setJobPostingText(text)
  }, [])

  /**
   * Clear profile and job posting text (cleanup)
   */
  const clearProfile = useCallback(() => {
    setProfile(null)
    setJobPostingText('')
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  // Functions are already memoized with useCallback, so they're stable
  const value: ProfileContextType = useMemo(
    () => ({
      profile,
      jobPostingText,
      updateProfile,
      updateJobPostingText,
      clearProfile,
    }),
    [profile, jobPostingText, updateProfile, updateJobPostingText, clearProfile]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

/**
 * useProfile Hook
 * 
 * Custom hook for consuming ProfileContext.
 * 
 * **Usage:**
 * ```tsx
 * const { profile, jobPostingText, updateProfile, updateJobPostingText, clearProfile } = useProfile()
 * ```
 * 
 * **Error Handling:**
 * Throws error if used outside ProfileProvider.
 * 
 * @returns ProfileContextType
 * @throws Error if used outside ProfileProvider
 */
export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

