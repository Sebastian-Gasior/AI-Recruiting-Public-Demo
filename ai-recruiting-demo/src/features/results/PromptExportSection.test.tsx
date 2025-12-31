import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromptExportSection } from './PromptExportSection'
import type { AnalysisResult } from '@/types/analysis.types'

// Mock clipboard API
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

describe('PromptExportSection', () => {
  const mockAnalysisResult: AnalysisResult = {
    summary: {
      matchLabel: 'Gute Passung',
      bullets: ['Test bullet'],
    },
    skillFit: {
      mustHave: [
        {
          requirement: 'TypeScript Erfahrung',
          status: 'met',
          evidence: '5 Jahre Erfahrung',
          relevance: 'high',
        },
      ],
      niceToHave: [],
    },
    gaps: [
      {
        requirement: 'Python Erfahrung',
        relevance: 'high',
        status: 'missing',
        recommendedAction: 'learn',
      },
    ],
    ats: {
      score: 75,
      breakdown: {
        structure: 80,
        coverage: 70,
        placement: 75,
        context: 75,
      },
      todos: [],
    },
    roleFocus: {
      risk: 'gering',
      reasons: [],
      recommendations: [],
    },
    nextSteps: [],
  }

  const mockJobPostingText = 'Senior TypeScript Developer\nWir suchen einen erfahrenen Entwickler...'

  beforeEach(() => {
    mockWriteText.mockResolvedValue(undefined)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should render component with analysis result and job posting text', () => {
    render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
      />
    )

    expect(screen.getByRole('region', { name: 'Prompt Export' })).toBeInTheDocument()
    expect(screen.getByText('Prompt Export für externe LLMs')).toBeInTheDocument()
  })

  it('should display mandatory privacy warning', () => {
    render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
      />
    )

    const warning = screen.getByRole('alert')
    expect(warning).toBeInTheDocument()
    expect(warning).toHaveTextContent('⚠️ Wichtig:')
    expect(warning).toHaveTextContent('Externe LLM-Anbieter')
    expect(warning).toHaveTextContent('Datenweitergabe')
  })

  it('should display generated prompt text in textarea', () => {
    render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
      />
    )

    const textarea = screen.getByLabelText('Generierter Prompt für externe LLMs') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('readOnly')
    expect(textarea.value).toContain('**Rolle:**')
  })

  it('should copy prompt to clipboard when copy button is clicked', async () => {
    render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
      />
    )

    const copyButton = screen.getByRole('button', {
      name: 'Prompt in Zwischenablage kopieren',
    })
    expect(copyButton).toBeInTheDocument()

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1)
    })

    const textarea = screen.getByLabelText('Generierter Prompt für externe LLMs')
    expect(mockWriteText).toHaveBeenCalledWith(textarea.value)
  })

  it('should show "Kopiert!" message after successful copy', async () => {
    render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
      />
    )

    const copyButton = screen.getByRole('button', {
      name: 'Prompt in Zwischenablage kopieren',
    })

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('Kopiert!')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Wait for state to reset (after 2 seconds)
    await waitFor(() => {
      expect(screen.getByText('In Zwischenablage kopieren')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle clipboard API errors gracefully and show error message', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard API not available'))

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
      />
    )

    const copyButton = screen.getByRole('button', {
      name: 'Prompt in Zwischenablage kopieren',
    })

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled()
    }, { timeout: 1000 })

    // Error message should be displayed (there are 2 alerts: privacy warning and error)
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/Fehler beim Kopieren|Clipboard API/i)).toBeInTheDocument()
    }, { timeout: 1000 })

    // Component should still be functional (no crash)
    expect(screen.getByRole('region', { name: 'Prompt Export' })).toBeInTheDocument()
    // Button should still be visible (not in "Kopiert!" state since copy failed)
    expect(screen.getByText('In Zwischenablage kopieren')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })

  it('should disable copy button when prompt text is empty', () => {
    const emptyResult: AnalysisResult = {
      summary: {
        matchLabel: 'Stretch-Rolle',
        bullets: [],
      },
      skillFit: {
        mustHave: [],
        niceToHave: [],
      },
      gaps: [],
      ats: {
        score: 0,
        breakdown: {
          structure: 0,
          coverage: 0,
          placement: 0,
          context: 0,
        },
        todos: [],
      },
      roleFocus: {
        risk: 'erhöht',
        reasons: [],
        recommendations: [],
      },
      nextSteps: [],
    }

    render(
      <PromptExportSection
        analysisResult={emptyResult}
        jobPostingText=""
      />
    )

    const copyButton = screen.getByRole('button', {
      name: 'Prompt in Zwischenablage kopieren',
    })

    expect(copyButton).toBeDisabled()
  })

  it('should be accessible with ARIA labels', () => {
    render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
      />
    )

    const region = screen.getByRole('region', { name: 'Prompt Export' })
    expect(region).toHaveAttribute('aria-label', 'Prompt Export')

    const textarea = screen.getByLabelText('Generierter Prompt für externe LLMs')
    expect(textarea).toHaveAttribute('aria-label', 'Generierter Prompt für externe LLMs')
    expect(textarea).toHaveAttribute('aria-describedby', 'prompt-description')
  })

  it('should apply custom className if provided', () => {
    const { container } = render(
      <PromptExportSection
        analysisResult={mockAnalysisResult}
        jobPostingText={mockJobPostingText}
        className="custom-class"
      />
    )

    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })
})

