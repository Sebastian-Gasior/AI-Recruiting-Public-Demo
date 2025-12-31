import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileProvider, useProfile } from './ProfileContext'
import type { Profile } from '@/types/profile.types'

/**
 * Test component that uses useProfile hook
 */
function TestComponent() {
  const { profile, jobPostingText, updateProfile, updateJobPostingText, clearProfile } = useProfile()

  return (
    <div>
      <div data-testid="profile">{profile ? JSON.stringify(profile) : 'null'}</div>
      <div data-testid="jobPostingText">{jobPostingText}</div>
      <button
        onClick={() =>
          updateProfile({
            id: 'test-id',
            name: 'Test Profile',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            data: {
              profileSummary: 'Test summary',
              experiences: [],
              education: [],
              skills: 'Test skills',
            },
          })
        }
        data-testid="update-profile"
      >
        Update Profile
      </button>
      <button
        onClick={() => updateJobPostingText('Test job posting')}
        data-testid="update-job-posting"
      >
        Update Job Posting
      </button>
      <button onClick={() => clearProfile()} data-testid="clear-profile">
        Clear Profile
      </button>
    </div>
  )
}

describe('ProfileContext', () => {
  beforeEach(() => {
    // Reset state before each test
  })

  it('should provide default values (null profile, empty jobPostingText)', () => {
    render(
      <ProfileProvider>
        <TestComponent />
      </ProfileProvider>
    )

    expect(screen.getByTestId('profile')).toHaveTextContent('null')
    expect(screen.getByTestId('jobPostingText')).toHaveTextContent('')
  })

  it('should update profile when updateProfile is called', async () => {
    const user = userEvent.setup()
    const testProfile: Profile = {
      id: 'test-id',
      name: 'Test Profile',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      data: {
        profileSummary: 'Test summary',
        experiences: [],
        education: [],
        skills: 'Test skills',
      },
    }

    render(
      <ProfileProvider>
        <TestComponent />
      </ProfileProvider>
    )

    const updateButton = screen.getByTestId('update-profile')
    await act(async () => {
      await user.click(updateButton)
    })

    const profileElement = screen.getByTestId('profile')
    expect(profileElement.textContent).toContain('test-id')
    expect(profileElement.textContent).toContain('Test Profile')
  })

  it('should update jobPostingText when updateJobPostingText is called', async () => {
    const user = userEvent.setup()
    render(
      <ProfileProvider>
        <TestComponent />
      </ProfileProvider>
    )

    const updateButton = screen.getByTestId('update-job-posting')
    await act(async () => {
      await user.click(updateButton)
    })

    expect(screen.getByTestId('jobPostingText')).toHaveTextContent('Test job posting')
  })

  it('should clear profile and jobPostingText when clearProfile is called', async () => {
    const user = userEvent.setup()
    render(
      <ProfileProvider>
        <TestComponent />
      </ProfileProvider>
    )

    // First update both
    await act(async () => {
      await user.click(screen.getByTestId('update-profile'))
      await user.click(screen.getByTestId('update-job-posting'))
    })

    // Then clear
    await act(async () => {
      await user.click(screen.getByTestId('clear-profile'))
    })

    expect(screen.getByTestId('profile')).toHaveTextContent('null')
    expect(screen.getByTestId('jobPostingText')).toHaveTextContent('')
  })

  it('should throw error when useProfile is used outside ProfileProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = () => {}

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useProfile must be used within a ProfileProvider')

    console.error = originalError
  })
})

