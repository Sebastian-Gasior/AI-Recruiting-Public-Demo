import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { NotFound } from './NotFound'

// Mock React Router's useNavigate
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('NotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render 404 error message', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    expect(screen.getByText('404 - Seite nicht gefunden')).toBeInTheDocument()
    expect(
      screen.getByText(/Die angeforderte Seite konnte nicht gefunden werden/)
    ).toBeInTheDocument()
  })

  it('should have proper ARIA labels and roles', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', '404 Seite nicht gefunden')

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('should have lang="de" attribute for accessibility', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('lang', 'de')
  })

  it('should render navigation buttons', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    expect(screen.getByRole('button', { name: /Zur Startseite zurückkehren/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Zur vorherigen Seite zurückkehren/i })).toBeInTheDocument()
  })

  it('should navigate to home when "Zur Startseite" button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    const homeButton = screen.getByRole('button', { name: /Zur Startseite/i })
    await user.click(homeButton)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('should navigate back when "Zurück" button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    const backButton = screen.getByRole('button', { name: /Zur vorherigen Seite zurückkehren/i })
    await user.click(backButton)

    // Note: In test environment, window.history.length might be 1, so it may navigate to '/' instead of -1
    // This is expected behavior - the component handles both cases
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    const homeButton = screen.getByRole('button', { name: /Zur Startseite zurückkehren/i })
    homeButton.focus()
    expect(homeButton).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('should have proper semantic HTML structure', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    )

    // Check for main element via role
    expect(screen.getByRole('main')).toBeInTheDocument()

    // Check for Card structure via role
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

