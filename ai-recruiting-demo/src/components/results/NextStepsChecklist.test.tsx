import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextStepsChecklist } from './NextStepsChecklist'

describe('NextStepsChecklist', () => {
  const mockNextSteps = [
    'Rollenfokus anpassen: Passen Sie Ihre Bewerbung an die Stellenausschreibung an',
    'ATS optimieren: Fügen Sie relevante Keywords hinzu',
    'Fähigkeitslücken schließen: Erlernen Sie fehlende Skills',
  ]

  it('should render component with nextSteps array', () => {
    render(<NextStepsChecklist nextSteps={mockNextSteps} />)

    expect(screen.getByText('Nächste Schritte')).toBeInTheDocument()
    expect(
      screen.getByText('Rollenfokus anpassen: Passen Sie Ihre Bewerbung an die Stellenausschreibung an')
    ).toBeInTheDocument()
  })

  it('should display all steps in order', () => {
    render(<NextStepsChecklist nextSteps={mockNextSteps} />)

    const steps = mockNextSteps.map((step) => screen.getByText(step))
    expect(steps).toHaveLength(3)

    // Verify order
    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).toHaveTextContent(mockNextSteps[0])
    expect(listItems[1]).toHaveTextContent(mockNextSteps[1])
    expect(listItems[2]).toHaveTextContent(mockNextSteps[2])
  })

  it('should handle empty array', () => {
    const { container } = render(<NextStepsChecklist nextSteps={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should handle single step', () => {
    const singleStep = ['Ein einzelner Schritt']
    render(<NextStepsChecklist nextSteps={singleStep} />)

    expect(screen.getByText('Nächste Schritte')).toBeInTheDocument()
    expect(screen.getByText('Ein einzelner Schritt')).toBeInTheDocument()
  })

  it('should handle multiple steps', () => {
    const manySteps = [
      'Schritt 1',
      'Schritt 2',
      'Schritt 3',
      'Schritt 4',
      'Schritt 5',
    ]
    render(<NextStepsChecklist nextSteps={manySteps} />)

    manySteps.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument()
    })
  })

  it('should apply className prop correctly', () => {
    const { container } = render(
      <NextStepsChecklist nextSteps={mockNextSteps} className="custom-class" />
    )
    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<NextStepsChecklist nextSteps={mockNextSteps} />)
      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-label', 'Nächste Schritte Checkliste')

      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-label', 'Priorisierte nächste Schritte')
    })

    it('should have semantic HTML structure', () => {
      render(<NextStepsChecklist nextSteps={mockNextSteps} />)

      const region = screen.getByRole('region')
      expect(region).toBeInTheDocument()

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(mockNextSteps.length)
    })

    it('should have accessibility labels for checklist items', () => {
      render(<NextStepsChecklist nextSteps={mockNextSteps} />)

      expect(
        screen.getByLabelText('Schritt 1: Rollenfokus anpassen: Passen Sie Ihre Bewerbung an die Stellenausschreibung an')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Schritt 2: ATS optimieren: Fügen Sie relevante Keywords hinzu')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Schritt 3: Fähigkeitslücken schließen: Erlernen Sie fehlende Skills')
      ).toBeInTheDocument()
    })

    it('should mark checkmark icons as decorative (aria-hidden)', () => {
      const { container } = render(<NextStepsChecklist nextSteps={mockNextSteps} />)

      // CheckCircle2 icons are rendered as SVG elements
      // Verify that icons exist in the structure and have aria-hidden="true"
      const listItems = screen.getAllByRole('listitem')
      listItems.forEach((item) => {
        // Each list item should contain an icon (checkmark)
        const icon = item.querySelector('svg[aria-hidden="true"]')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })

      // Verify all SVG icons have aria-hidden="true"
      const allIcons = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(allIcons.length).toBe(mockNextSteps.length)
    })
  })

  describe('always visible requirement', () => {
    it('should always render when nextSteps array has items', () => {
      render(<NextStepsChecklist nextSteps={mockNextSteps} />)

      // Component should be visible (not hidden or collapsed)
      const card = screen.getByRole('region')
      expect(card).toBeVisible()

      // No collapse/expand functionality should exist
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })

    it('should not render when nextSteps array is empty', () => {
      const { container } = render(<NextStepsChecklist nextSteps={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('should not render when nextSteps is null or undefined', () => {
      const { container: nullContainer } = render(
        <NextStepsChecklist nextSteps={null as any} />
      )
      expect(nullContainer.firstChild).toBeNull()

      const { container: undefinedContainer } = render(
        <NextStepsChecklist nextSteps={undefined as any} />
      )
      expect(undefinedContainer.firstChild).toBeNull()
    })
  })
})

