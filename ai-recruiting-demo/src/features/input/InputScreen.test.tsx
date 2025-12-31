import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { AnalysisProvider } from '@/contexts/AnalysisContext'
import type { Profile } from '@/types/profile.types'

// Mock useNavigate before importing component
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/input', state: null }),
  }
})

// Mock profileService
vi.mock('@/services/profileService', () => ({
  create: vi.fn(),
  get: vi.fn(),
  export: vi.fn(),
  import: vi.fn(),
}))

// Mock Dialog component to avoid React hook issues
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

// Import component after mocks are set up
import InputScreen from './InputScreen'

describe('InputScreen - handleStartAnalysis Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should navigate to /analysis with profile and jobPostingText when validation passes', async () => {
    render(
      <BrowserRouter>
        <ProfileProvider>
          <AnalysisProvider>
            <InputScreen />
          </AnalysisProvider>
        </ProfileProvider>
      </BrowserRouter>
    )

    // Fill in required fields
    const skillsInput = screen.getByRole('textbox', { name: /^Skills/i })
    fireEvent.change(skillsInput, { target: { value: 'TypeScript, React' } })

    const jobPostingInput = screen.getByRole('textbox', { name: /Job Posting/i })
    fireEvent.change(jobPostingInput, {
      target: { value: 'Looking for TypeScript developer with React experience' },
    })

    // Click "Start Analysis" button
    const startButton = screen.getByRole('button', { name: /Analyse starten/i })
    fireEvent.click(startButton)

    // Wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/analysis',
        expect.objectContaining({
          state: expect.objectContaining({
            profile: expect.objectContaining({
              data: expect.objectContaining({
                skills: 'TypeScript, React',
              }),
            }),
            jobPostingText: 'Looking for TypeScript developer with React experience',
          }),
        })
      )
    })
  })

  it('should create Profile object with all form data', async () => {
    render(
      <BrowserRouter>
        <ProfileProvider>
          <AnalysisProvider>
            <InputScreen />
          </AnalysisProvider>
        </ProfileProvider>
      </BrowserRouter>
    )

    // Fill in all fields
    const profileSummaryInput = screen.getByRole('textbox', { name: /Profile Summary/i })
    fireEvent.change(profileSummaryInput, {
      target: { value: 'Experienced developer' },
    })

    const skillsInput = screen.getByRole('textbox', { name: /^Skills/i })
    fireEvent.change(skillsInput, { target: { value: 'TypeScript, React' } })

    // Projects section is in an accordion, need to open it first
    const projectsAccordion = screen.getByRole('button', { name: /Projects\/Responsibilities/i })
    fireEvent.click(projectsAccordion)
    
    // Wait for accordion to open and then find the textarea
    await waitFor(() => {
      const projectsInput = screen.getByRole('textbox', { name: /Projects/i })
      fireEvent.change(projectsInput, {
        target: { value: 'Built web applications' },
      })
    })

    const jobPostingInput = screen.getByRole('textbox', { name: /^Job Posting/i })
    fireEvent.change(jobPostingInput, {
      target: { value: 'Looking for developer' },
    })

    // Click "Start Analysis" button
    const startButton = screen.getByRole('button', { name: /Analyse starten/i })
    fireEvent.click(startButton)

    // Verify Profile object structure
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/analysis',
        expect.objectContaining({
          state: expect.objectContaining({
            profile: expect.objectContaining({
              id: '',
              name: '',
              data: expect.objectContaining({
                profileSummary: 'Experienced developer',
                skills: 'TypeScript, React',
                projects: 'Built web applications',
                experiences: expect.any(Array),
                education: expect.any(Array),
              }),
            }),
          }),
        })
      )
    })
  })

  it('should show error feedback when job posting is missing', async () => {
    render(
      <BrowserRouter>
        <ProfileProvider>
          <AnalysisProvider>
            <InputScreen />
          </AnalysisProvider>
        </ProfileProvider>
      </BrowserRouter>
    )

    // Fill in skills (required)
    const skillsInput = screen.getByRole('textbox', { name: /^Skills/i })
    fireEvent.change(skillsInput, { target: { value: 'TypeScript' } })

    // Don't fill in job posting

    // Click "Start Analysis" button
    const startButton = screen.getByRole('button', { name: /Analyse starten/i })
    fireEvent.click(startButton)

    // Should show error message
    await waitFor(() => {
      expect(
        screen.getByText(/Bitte geben Sie eine Stellenausschreibung ein/i)
      ).toBeInTheDocument()
    })

    // Should NOT navigate
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should show error feedback when validation fails', async () => {
    render(
      <BrowserRouter>
        <ProfileProvider>
          <AnalysisProvider>
            <InputScreen />
          </AnalysisProvider>
        </ProfileProvider>
      </BrowserRouter>
    )

    // Don't fill in required fields (skills or job posting)
    // Both are required, so validation should fail

    // Try to click the button - it should not navigate because validation fails
    const startButton = screen.getByRole('button', { name: /Analyse starten/i })
    fireEvent.click(startButton)

    // Should not navigate because validation failed
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled()
    }, { timeout: 500 })
  })

  it('should trim job posting text before navigation', async () => {
    render(
      <BrowserRouter>
        <ProfileProvider>
          <AnalysisProvider>
            <InputScreen />
          </AnalysisProvider>
        </ProfileProvider>
      </BrowserRouter>
    )

    // Fill in required fields
    const skillsInput = screen.getByRole('textbox', { name: /^Skills/i })
    fireEvent.change(skillsInput, { target: { value: 'TypeScript' } })

    const jobPostingInput = screen.getByRole('textbox', { name: /Job Posting/i })
    fireEvent.change(jobPostingInput, {
      target: { value: '  Looking for developer  ' }, // With whitespace
    })

    // Click "Start Analysis" button
    const startButton = screen.getByRole('button', { name: /Analyse starten/i })
    fireEvent.click(startButton)

    // Verify jobPostingText is trimmed
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/analysis',
        expect.objectContaining({
          state: expect.objectContaining({
            jobPostingText: 'Looking for developer', // Trimmed
          }),
        })
      )
    })
  })

  it('should handle empty profileSummary and projects as undefined', async () => {
    render(
      <BrowserRouter>
        <ProfileProvider>
          <AnalysisProvider>
            <InputScreen />
          </AnalysisProvider>
        </ProfileProvider>
      </BrowserRouter>
    )

    // Fill in only required fields
    const skillsInput = screen.getByRole('textbox', { name: /^Skills/i })
    fireEvent.change(skillsInput, { target: { value: 'TypeScript' } })

    const jobPostingInput = screen.getByRole('textbox', { name: /Job Posting/i })
    fireEvent.change(jobPostingInput, {
      target: { value: 'Looking for developer' },
    })

    // Click "Start Analysis" button
    const startButton = screen.getByRole('button', { name: /Analyse starten/i })
    fireEvent.click(startButton)

    // Verify optional fields are undefined when empty
    await waitFor(() => {
      const navigateCall = mockNavigate.mock.calls[0]
      const profile = navigateCall[1].state.profile as Profile
      expect(profile.data.profileSummary).toBeUndefined()
      expect(profile.data.projects).toBeUndefined()
    })
  })

  it('should include experiences and education in Profile object', async () => {
    render(
      <BrowserRouter>
        <ProfileProvider>
          <AnalysisProvider>
            <InputScreen />
          </AnalysisProvider>
        </ProfileProvider>
      </BrowserRouter>
    )

    // Fill in required fields
    const skillsInput = screen.getByRole('textbox', { name: /^Skills/i })
    fireEvent.change(skillsInput, { target: { value: 'TypeScript' } })

    const jobPostingInput = screen.getByRole('textbox', { name: /Job Posting/i })
    fireEvent.change(jobPostingInput, {
      target: { value: 'Looking for developer' },
    })

    // Add an experience
    const addExperienceButton = screen.getByLabelText(/Add Work Experience Entry/i)
    fireEvent.click(addExperienceButton)

    // Add an education
    const addEducationButton = screen.getByLabelText(/Add Education Entry/i)
    fireEvent.click(addEducationButton)

    // Click "Start Analysis" button
    const startButton = screen.getByRole('button', { name: /Analyse starten/i })
    fireEvent.click(startButton)

    // Verify experiences and education are included
    await waitFor(() => {
      const navigateCall = mockNavigate.mock.calls[0]
      const profile = navigateCall[1].state.profile as Profile
      expect(profile.data.experiences).toHaveLength(1)
      expect(profile.data.education).toHaveLength(1)
    })
  })
})

