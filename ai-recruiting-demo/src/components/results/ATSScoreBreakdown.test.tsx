import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ATSScoreBreakdown } from './ATSScoreBreakdown'
import type { ATSAnalysis } from '@/types'

describe('ATSScoreBreakdown', () => {
  const mockATS: ATSAnalysis = {
    score: 75,
    breakdown: {
      structure: 80,
      coverage: 70,
      placement: 75,
      context: 75,
    },
    todos: [
      'Fügen Sie mehr quantifizierbare Ergebnisse hinzu',
      'Verwenden Sie stärkere Aktionsverben',
    ],
  }

  it('should render component with all required props', () => {
    render(<ATSScoreBreakdown ats={mockATS} />)

    expect(screen.getByText('ATS Score')).toBeInTheDocument()
    expect(screen.getByLabelText('Gesamt ATS Score: 75 von 100')).toBeInTheDocument()
    expect(screen.getByText('von 100 Punkten')).toBeInTheDocument()
  })

  describe('overall score display', () => {
    it('should display overall score correctly', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)
      const overallScore = screen.getByLabelText('Gesamt ATS Score: 75 von 100')
      expect(overallScore).toBeInTheDocument()
      expect(overallScore).toHaveTextContent('75')
    })

    it('should display low score (0-49) with appropriate styling', () => {
      const lowScoreATS: ATSAnalysis = {
        ...mockATS,
        score: 40,
      }
      render(<ATSScoreBreakdown ats={lowScoreATS} />)
      expect(screen.getByText('40')).toBeInTheDocument()
      expect(screen.getByText('Optimierungsbedarf')).toBeInTheDocument()
    })

    it('should display medium score (50-69) with appropriate styling', () => {
      const mediumScoreATS: ATSAnalysis = {
        ...mockATS,
        score: 60,
      }
      render(<ATSScoreBreakdown ats={mediumScoreATS} />)
      expect(screen.getByText('60')).toBeInTheDocument()
      expect(screen.getByText('Verbesserung möglich')).toBeInTheDocument()
    })

    it('should display high score (70-100) with appropriate styling', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)
      const overallScore = screen.getByLabelText('Gesamt ATS Score: 75 von 100')
      expect(overallScore).toHaveTextContent('75')
      expect(screen.getByText('Gut optimiert')).toBeInTheDocument()
    })
  })

  describe('breakdown scores display', () => {
    it('should display all breakdown scores', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)

      expect(screen.getByText('Struktur')).toBeInTheDocument()
      expect(screen.getByText('Abdeckung')).toBeInTheDocument()
      expect(screen.getByText('Platzierung')).toBeInTheDocument()
      expect(screen.getByText('Kontext')).toBeInTheDocument()
    })

    it('should display breakdown score values correctly', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)

      expect(screen.getByLabelText('Struktur: 80 von 100')).toBeInTheDocument()
      expect(screen.getByLabelText('Abdeckung: 70 von 100')).toBeInTheDocument()
      expect(screen.getByLabelText('Platzierung: 75 von 100')).toBeInTheDocument()
      expect(screen.getByLabelText('Kontext: 75 von 100')).toBeInTheDocument()
    })

    it('should render progress bars with correct accessibility attributes', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)

      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars).toHaveLength(4)

      // Check Structure progress bar
      const structureProgress = progressBars.find((bar) =>
        bar.getAttribute('aria-label')?.includes('Struktur')
      )
      expect(structureProgress).toHaveAttribute('aria-valuenow', '80')
      expect(structureProgress).toHaveAttribute('aria-valuemin', '0')
      expect(structureProgress).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('todos list display', () => {
    it('should display todos list when provided', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)

      expect(screen.getByText('Optimierungsvorschläge')).toBeInTheDocument()
      expect(
        screen.getByText('Fügen Sie mehr quantifizierbare Ergebnisse hinzu')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Verwenden Sie stärkere Aktionsverben')
      ).toBeInTheDocument()
    })

    it('should handle empty todos array', () => {
      const atsWithoutTodos: ATSAnalysis = {
        ...mockATS,
        todos: [],
      }
      render(<ATSScoreBreakdown ats={atsWithoutTodos} />)

      expect(screen.queryByText('Optimierungsvorschläge')).not.toBeInTheDocument()
    })

    it('should display all todos items', () => {
      const atsWithManyTodos: ATSAnalysis = {
        ...mockATS,
        todos: ['Vorschlag 1', 'Vorschlag 2', 'Vorschlag 3'],
      }
      render(<ATSScoreBreakdown ats={atsWithManyTodos} />)

      expect(screen.getByText('Vorschlag 1')).toBeInTheDocument()
      expect(screen.getByText('Vorschlag 2')).toBeInTheDocument()
      expect(screen.getByText('Vorschlag 3')).toBeInTheDocument()
    })
  })

  it('should apply className prop correctly', () => {
    const { container } = render(
      <ATSScoreBreakdown ats={mockATS} className="custom-class" />
    )
    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)
      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-label', 'ATS Score Breakdown')
    })

    it('should have semantic HTML structure', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)
      const article = screen.getByRole('article')
      expect(article).toBeInTheDocument()

      // Check for heading (CardTitle renders as h3)
      const heading = screen.getByText('ATS Score')
      expect(heading.tagName).toBe('H3')
    })

    it('should have accessibility attributes for progress bars', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)

      const progressBars = screen.getAllByRole('progressbar')
      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuenow')
        expect(bar).toHaveAttribute('aria-valuemin', '0')
        expect(bar).toHaveAttribute('aria-valuemax', '100')
        expect(bar).toHaveAttribute('aria-label')
      })
    })

    it('should have accessibility labels for todos', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)

      expect(
        screen.getByLabelText('Vorschlag 1: Fügen Sie mehr quantifizierbare Ergebnisse hinzu')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Vorschlag 2: Verwenden Sie stärkere Aktionsverben')
      ).toBeInTheDocument()
    })
  })

  describe('visual elements', () => {
    it('should render progress bars with correct widths', () => {
      render(<ATSScoreBreakdown ats={mockATS} />)

      const progressBars = screen.getAllByRole('progressbar')
      const structureProgress = progressBars.find((bar) =>
        bar.getAttribute('aria-label')?.includes('Struktur')
      )

      if (structureProgress) {
        const innerDiv = structureProgress.querySelector('div[style]')
        expect(innerDiv).toHaveStyle({ width: '80%' })
      }
    })

    it('should apply correct color classes based on score values', () => {
      // Test low score
      const lowScoreATS: ATSAnalysis = {
        ...mockATS,
        score: 30,
        breakdown: {
          structure: 30,
          coverage: 30,
          placement: 30,
          context: 30,
        },
      }
      const { container: lowContainer } = render(<ATSScoreBreakdown ats={lowScoreATS} />)
      expect(lowContainer.querySelector('.text-error-500')).toBeInTheDocument()

      // Test medium score
      const mediumScoreATS: ATSAnalysis = {
        ...mockATS,
        score: 60,
        breakdown: {
          structure: 60,
          coverage: 60,
          placement: 60,
          context: 60,
        },
      }
      const { container: mediumContainer } = render(
        <ATSScoreBreakdown ats={mediumScoreATS} />
      )
      expect(mediumContainer.querySelector('.text-warning-500')).toBeInTheDocument()

      // Test high score
      const { container: highContainer } = render(<ATSScoreBreakdown ats={mockATS} />)
      expect(highContainer.querySelector('.text-success-500')).toBeInTheDocument()
    })
  })
})

