import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GapActionCard } from './GapActionCard'
import type { GapActionCard as GapActionCardType } from '@/types'

describe('GapActionCard', () => {
  const mockGap: GapActionCardType = {
    requirement: 'TypeScript Erfahrung',
    relevance: 'high',
    status: 'missing',
    recommendedAction: 'learn',
    suggestionType: 'Zusätzliche Hinweise',
  }

  it('should render component with all required props', () => {
    render(<GapActionCard gap={mockGap} />)

    expect(screen.getByText('TypeScript Erfahrung')).toBeInTheDocument()
    expect(screen.getByText('Hohe Relevanz')).toBeInTheDocument()
    expect(screen.getByText('Fehlt')).toBeInTheDocument()
    expect(screen.getByText('Erlernen:')).toBeInTheDocument()
  })

  it('should handle optional suggestionType prop', () => {
    const gapWithoutSuggestion: GapActionCardType = {
      ...mockGap,
      suggestionType: undefined,
    }
    render(<GapActionCard gap={gapWithoutSuggestion} />)

    expect(screen.getByText('TypeScript Erfahrung')).toBeInTheDocument()
    expect(screen.queryByText('Zusätzliche Hinweise')).not.toBeInTheDocument()
  })

  describe('relevance levels', () => {
    it('should display high relevance correctly', () => {
      const gapHigh: GapActionCardType = { ...mockGap, relevance: 'high' }
      render(<GapActionCard gap={gapHigh} />)
      expect(screen.getByText('Hohe Relevanz')).toBeInTheDocument()
    })

    it('should display medium relevance correctly', () => {
      const gapMedium: GapActionCardType = { ...mockGap, relevance: 'medium' }
      render(<GapActionCard gap={gapMedium} />)
      expect(screen.getByText('Mittlere Relevanz')).toBeInTheDocument()
    })

    it('should display low relevance correctly', () => {
      const gapLow: GapActionCardType = { ...mockGap, relevance: 'low' }
      render(<GapActionCard gap={gapLow} />)
      expect(screen.getByText('Niedrige Relevanz')).toBeInTheDocument()
    })
  })

  describe('status values', () => {
    it('should display partial status correctly', () => {
      const gapPartial: GapActionCardType = { ...mockGap, status: 'partial' }
      render(<GapActionCard gap={gapPartial} />)
      expect(screen.getByText('Teilweise vorhanden')).toBeInTheDocument()
    })

    it('should display missing status correctly', () => {
      const gapMissing: GapActionCardType = { ...mockGap, status: 'missing' }
      render(<GapActionCard gap={gapMissing} />)
      expect(screen.getByText('Fehlt')).toBeInTheDocument()
    })
  })

  describe('recommended actions', () => {
    it('should display rephrase action correctly', () => {
      const gapRephrase: GapActionCardType = {
        ...mockGap,
        recommendedAction: 'rephrase',
      }
      render(<GapActionCard gap={gapRephrase} />)
      expect(screen.getByText('Umformulieren:')).toBeInTheDocument()
      expect(
        screen.getByText('Formulieren Sie Ihre vorhandenen Skills anders')
      ).toBeInTheDocument()
    })

    it('should display evidence action correctly', () => {
      const gapEvidence: GapActionCardType = {
        ...mockGap,
        recommendedAction: 'evidence',
      }
      render(<GapActionCard gap={gapEvidence} />)
      expect(screen.getByText('Belege hinzufügen:')).toBeInTheDocument()
      expect(
        screen.getByText('Fügen Sie konkrete Beispiele oder Projekte hinzu')
      ).toBeInTheDocument()
    })

    it('should display learn action correctly', () => {
      const gapLearn: GapActionCardType = { ...mockGap, recommendedAction: 'learn' }
      render(<GapActionCard gap={gapLearn} />)
      expect(screen.getByText('Erlernen:')).toBeInTheDocument()
      expect(
        screen.getByText('Erlernen Sie diese Fähigkeit vor der Bewerbung')
      ).toBeInTheDocument()
    })

    it('should display ignore action correctly', () => {
      const gapIgnore: GapActionCardType = { ...mockGap, recommendedAction: 'ignore' }
      render(<GapActionCard gap={gapIgnore} />)
      expect(screen.getByText('Ignorieren:')).toBeInTheDocument()
      expect(
        screen.getByText('Diese Anforderung kann ignoriert werden')
      ).toBeInTheDocument()
    })
  })

  it('should apply className prop correctly', () => {
    const { container } = render(<GapActionCard gap={mockGap} className="custom-class" />)
    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<GapActionCard gap={mockGap} />)
      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-label', 'Skill Gap: TypeScript Erfahrung')
    })

    it('should have semantic HTML structure', () => {
      render(<GapActionCard gap={mockGap} />)
      const article = screen.getByRole('article')
      expect(article).toBeInTheDocument()

      // Check for heading (CardTitle renders as h3)
      const heading = screen.getByText('TypeScript Erfahrung')
      expect(heading.tagName).toBe('H3')
    })

    it('should have accessibility attributes for badges', () => {
      render(<GapActionCard gap={mockGap} />)
      expect(screen.getByLabelText('Relevanz: Hohe Relevanz')).toBeInTheDocument()
      expect(screen.getByLabelText('Status: Fehlt')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Empfohlene Aktion: Erlernen')
      ).toBeInTheDocument()
    })
  })

  it('should render suggestionType when provided', () => {
    const gapWithSuggestion: GapActionCardType = {
      ...mockGap,
      suggestionType: 'Zusätzliche Hinweise zur Umsetzung',
    }
    render(<GapActionCard gap={gapWithSuggestion} />)
    expect(screen.getByText('Zusätzliche Hinweise zur Umsetzung')).toBeInTheDocument()
    expect(screen.getByLabelText('Zusätzliche Hinweise')).toBeInTheDocument()
  })
})

