import { describe, it, expect } from 'vitest'
import { generateCoverLetterPrompt } from './promptExport'
import type { AnalysisResult } from '@/types/analysis.types'

describe('promptExport', () => {
  describe('generateCoverLetterPrompt', () => {
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
          {
            requirement: 'React Erfahrung',
            status: 'met',
            evidence: '3 Jahre Erfahrung',
            relevance: 'high',
          },
          {
            requirement: 'Node.js Erfahrung',
            status: 'partial',
            evidence: 'Grundkenntnisse',
            relevance: 'medium',
          },
          {
            requirement: 'Python Erfahrung',
            status: 'missing',
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
        {
          requirement: 'Docker Erfahrung',
          relevance: 'high',
          status: 'missing',
          recommendedAction: 'learn',
        },
        {
          requirement: 'Optional Skill',
          relevance: 'low',
          status: 'missing',
          recommendedAction: 'ignore',
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

    it('should generate prompt with role title from job posting', () => {
      const jobPostingText = 'Senior TypeScript Developer\nWir suchen einen erfahrenen Entwickler...'
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, jobPostingText)

      expect(prompt).toContain('**Rolle:**')
      expect(prompt).toContain('Senior TypeScript Developer')
    })

    it('should include top met items as strengths with evidence', () => {
      const jobPostingText = 'Developer Position'
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, jobPostingText)

      expect(prompt).toContain('**Stärken (Top Passungen):**')
      expect(prompt).toContain('TypeScript Erfahrung')
      expect(prompt).toContain('5 Jahre Erfahrung')
      expect(prompt).toContain('React Erfahrung')
      expect(prompt).toContain('3 Jahre Erfahrung')
    })

    it('should include top 1-2 high-relevance missing gaps', () => {
      const jobPostingText = 'Developer Position'
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, jobPostingText)

      expect(prompt).toContain('**Wichtige Lücken (beim Anschreiben berücksichtigen):**')
      expect(prompt).toContain('Python Erfahrung')
      expect(prompt).toContain('Docker Erfahrung')
      // Should not include low-relevance gaps
      expect(prompt).not.toContain('Optional Skill')
    })

    it('should exclude leadership/strategy if not in job requirements', () => {
      const jobPostingText = 'Developer Position - keine Führungserfahrung nötig'
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, jobPostingText)

      expect(prompt).toContain('Keine Führungs- oder Strategieerfahrung erwähnen')
    })

    it('should include leadership/strategy if mentioned in job requirements', () => {
      const jobPostingText = 'Team Lead Position - Leadership erforderlich'
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, jobPostingText)

      expect(prompt).not.toContain('Keine Führungs- oder Strategieerfahrung erwähnen')
    })

    it('should include tone and exclusions guidance', () => {
      const jobPostingText = 'Developer Position'
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, jobPostingText)

      expect(prompt).toContain('**Hinweise für Anschreiben:**')
      expect(prompt).toContain('Professioneller, präziser Ton')
      expect(prompt).toContain('Keine Gehaltsangaben erwähnen')
      expect(prompt).toContain('Keine erfundenen Fähigkeiten angeben')
    })

    it('should handle empty analysis result gracefully', () => {
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

      const jobPostingText = 'Developer Position'
      const prompt = generateCoverLetterPrompt(emptyResult, jobPostingText)

      expect(prompt).toContain('**Rolle:**')
      expect(prompt).not.toContain('**Stärken')
      expect(prompt).not.toContain('**Wichtige Lücken')
    })

    it('should handle empty job posting text', () => {
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, '')

      expect(prompt).toContain('**Rolle:**')
      expect(prompt).toContain('Stellenausschreibung')
    })

    it('should limit strengths to top 5 met items', () => {
      const resultWithManyMetItems: AnalysisResult = {
        ...mockAnalysisResult,
        skillFit: {
          mustHave: Array.from({ length: 10 }, (_, i) => ({
            requirement: `Skill ${i + 1}`,
            status: 'met' as const,
            evidence: `Evidence ${i + 1}`,
            relevance: 'high' as const,
          })),
          niceToHave: [],
        },
      }

      const jobPostingText = 'Developer Position'
      const prompt = generateCoverLetterPrompt(resultWithManyMetItems, jobPostingText)

      const strengthLines = prompt
        .split('\n')
        .filter(line => line.startsWith('- ') && line.includes('Skill'))

      expect(strengthLines.length).toBeLessThanOrEqual(5)
    })

    it('should not include full CV or full job posting', () => {
      const jobPostingText = 'Senior Developer\n\nThis is a very long job posting with many details that should not be copied entirely into the prompt. The prompt should only extract the role title from the first line, not the entire job description. Additional details about requirements, responsibilities, and company information should not be included.'
      const prompt = generateCoverLetterPrompt(mockAnalysisResult, jobPostingText)

      // Should not contain typical CV fields
      expect(prompt).not.toContain('Berufserfahrung')
      expect(prompt).not.toContain('Bildung')
      // Should only contain extracted role title (first line), not full job posting
      expect(prompt).toContain('**Rolle:**')
      expect(prompt).toContain('Senior Developer')
      // Should not contain details from later in the job posting
      expect(prompt).not.toContain('Additional details about requirements')
      expect(prompt).not.toContain('company information')
    })
  })
})

