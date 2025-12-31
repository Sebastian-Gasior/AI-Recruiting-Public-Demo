import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalysisProvider, useAnalysis } from './AnalysisContext'
import type { AnalysisResult } from '@/types/analysis.types'

/**
 * Test component that uses useAnalysis hook
 */
function TestComponent() {
  const { analysisResult, setAnalysisResult, clearAnalysisResult } = useAnalysis()

  const mockAnalysisResult: AnalysisResult = {
    summary: {
      matchLabel: 'Gute Passung',
      bullets: ['Test bullet 1', 'Test bullet 2'],
    },
    skillFit: {
      mustHave: [],
      niceToHave: [],
    },
    gaps: [],
    ats: {
      score: 85,
      breakdown: {
        structure: 90,
        coverage: 80,
        placement: 85,
        context: 85,
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

  return (
    <div>
      <div data-testid="analysis-result">
        {analysisResult ? JSON.stringify(analysisResult) : 'null'}
      </div>
      <button
        onClick={() => setAnalysisResult(mockAnalysisResult)}
        data-testid="set-analysis-result"
      >
        Set Analysis Result
      </button>
      <button onClick={() => clearAnalysisResult()} data-testid="clear-analysis-result">
        Clear Analysis Result
      </button>
    </div>
  )
}

describe('AnalysisContext', () => {
  beforeEach(() => {
    // Reset state before each test
  })

  it('should provide default values (null analysisResult)', () => {
    render(
      <AnalysisProvider>
        <TestComponent />
      </AnalysisProvider>
    )

    expect(screen.getByTestId('analysis-result')).toHaveTextContent('null')
  })

  it('should update analysisResult when setAnalysisResult is called', async () => {
    const user = userEvent.setup()
    render(
      <AnalysisProvider>
        <TestComponent />
      </AnalysisProvider>
    )

    const setButton = screen.getByTestId('set-analysis-result')
    await act(async () => {
      await user.click(setButton)
    })

    const resultElement = screen.getByTestId('analysis-result')
    expect(resultElement.textContent).toContain('Gute Passung')
    expect(resultElement.textContent).toContain('85')
  })

  it('should clear analysisResult when clearAnalysisResult is called', async () => {
    const user = userEvent.setup()
    render(
      <AnalysisProvider>
        <TestComponent />
      </AnalysisProvider>
    )

    // First set result
    await act(async () => {
      await user.click(screen.getByTestId('set-analysis-result'))
    })

    // Then clear
    await act(async () => {
      await user.click(screen.getByTestId('clear-analysis-result'))
    })

    expect(screen.getByTestId('analysis-result')).toHaveTextContent('null')
  })

  it('should throw error when useAnalysis is used outside AnalysisProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = () => {}

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAnalysis must be used within an AnalysisProvider')

    console.error = originalError
  })
})

