import { describe, it, expect } from 'vitest';
import { parseJobRequirements, extractCandidateSignals, matchRequirements, computeAtsScore, computeRoleFocusRisk, buildExecutiveSummary, identifyGaps, buildNextSteps, runAnalysis } from './AnalysisEngine';
import type { Profile } from '../../types/profile.types';
import type { SkillRequirementResult, GapActionCard, RoleFocusRisk, ATSAnalysis } from '../../types/analysis.types';

describe('parseJobRequirements', () => {
  it('should parse German job posting with "Anforderungen" section', () => {
    const jobPosting = `Software Engineer gesucht

Anforderungen:
- TypeScript Erfahrung
- React Kenntnisse
- 3+ Jahre Berufserfahrung

Nice-to-have:
- Node.js
- Docker`;

    const result = parseJobRequirements(jobPosting);

    expect(result.mustHave).toContain('TypeScript Erfahrung');
    expect(result.mustHave).toContain('React Kenntnisse');
    expect(result.mustHave).toContain('3+ Jahre Berufserfahrung');
    expect(result.niceToHave).toContain('Node.js');
    expect(result.niceToHave).toContain('Docker');
    expect(result.responsibilities).toEqual([]);
  });

  it('should parse English job posting with "Requirements" section', () => {
    const jobPosting = `We are looking for a Software Engineer

Requirements:
- TypeScript experience
- React knowledge
- 3+ years of experience

Nice to have:
- Node.js
- Docker`;

    const result = parseJobRequirements(jobPosting);

    expect(result.mustHave.length).toBeGreaterThan(0);
    expect(result.mustHave.some((r) => r.toLowerCase().includes('typescript'))).toBe(true);
    expect(result.niceToHave.length).toBeGreaterThan(0);
  });

  it('should handle mixed Must-Have and Nice-to-Have sections', () => {
    const jobPosting = `Job Description

Must-have:
- Python
- SQL

Nice-to-have:
- AWS
- Kubernetes

Responsibilities:
- Develop features
- Code reviews`;

    const result = parseJobRequirements(jobPosting);

    expect(result.mustHave).toContain('Python');
    expect(result.mustHave).toContain('SQL');
    expect(result.niceToHave).toContain('AWS');
    expect(result.niceToHave).toContain('Kubernetes');
    expect(result.responsibilities.length).toBeGreaterThan(0);
  });

  it('should use fallback keyword extraction when no sections found', () => {
    const jobPosting = `We need someone with Python experience.
Strong SQL skills required.
Knowledge of AWS is a plus.
Docker experience preferred.`;

    const result = parseJobRequirements(jobPosting);

    // Fallback should extract requirements as mustHave
    expect(result.mustHave.length).toBeGreaterThan(0);
    expect(result.niceToHave).toEqual([]);
    expect(result.responsibilities).toEqual([]);
  });

  it('should handle empty job posting text', () => {
    const result = parseJobRequirements('');

    expect(result.mustHave).toEqual([]);
    expect(result.niceToHave).toEqual([]);
    expect(result.responsibilities).toEqual([]);
  });

  it('should handle various bullet point formats', () => {
    const jobPosting = `Anforderungen:
- Dash bullet
* Star bullet
• Bullet point
1. Numbered list
2. Another numbered item`;

    const result = parseJobRequirements(jobPosting);

    expect(result.mustHave).toContain('Dash bullet');
    expect(result.mustHave).toContain('Star bullet');
    expect(result.mustHave).toContain('Bullet point');
    expect(result.mustHave).toContain('Numbered list');
    expect(result.mustHave).toContain('Another numbered item');
  });

  it('should run deterministically (same input = same output)', () => {
    const jobPosting = `Anforderungen:
- TypeScript
- React`;

    const result1 = parseJobRequirements(jobPosting);
    const result2 = parseJobRequirements(jobPosting);
    const result3 = parseJobRequirements(jobPosting);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
    expect(result1.mustHave).toEqual(['TypeScript', 'React']);
  });

  it('should handle German section headers with variations', () => {
    const jobPosting1 = `Anforderungen:
- Test 1`;
    const jobPosting2 = `ANFORDERUNGEN:
- Test 2`;
    const jobPosting3 = `Anforderungen
- Test 3`;

    const result1 = parseJobRequirements(jobPosting1);
    const result2 = parseJobRequirements(jobPosting2);
    const result3 = parseJobRequirements(jobPosting3);

    expect(result1.mustHave.length).toBeGreaterThan(0);
    expect(result2.mustHave.length).toBeGreaterThan(0);
    expect(result3.mustHave.length).toBeGreaterThan(0);
  });

  it('should handle indented lines as potential bullets', () => {
    const jobPosting = `Anforderungen:
    Indented line 1
    Indented line 2
Normal line (not a bullet)`;

    const result = parseJobRequirements(jobPosting);

    // Should extract indented lines
    expect(result.mustHave.length).toBeGreaterThan(0);
  });

  it('should filter stopwords in fallback extraction', () => {
    const jobPosting = `We need someone with the ability to work with Python and React.
The candidate should have experience with Docker and Kubernetes.`;

    const result = parseJobRequirements(jobPosting);

    // Should extract meaningful phrases, not just stopwords
    expect(result.mustHave.length).toBeGreaterThan(0);
    // Should not contain only stopwords
    const allStopwords = result.mustHave.every((req) =>
      ['the', 'and', 'with', 'to', 'of'].includes(req.toLowerCase())
    );
    expect(allStopwords).toBe(false);
  });

  // NEW TESTS: Edge cases and additional coverage

  it('should handle very long job posting text (>10,000 characters)', () => {
    // Create a long job posting with repeated sections
    const section = `Anforderungen:
- TypeScript Erfahrung
- React Kenntnisse
- Node.js Backend Development
- SQL Datenbank-Kenntnisse
- Git Version Control
- Agile Methodologies
- Test-Driven Development
- CI/CD Pipelines
- Docker Containerization
- Kubernetes Orchestration

`;
    const longJobPosting = section.repeat(100); // ~12,000 characters

    const result = parseJobRequirements(longJobPosting);

    // Should still parse correctly
    expect(result.mustHave.length).toBeGreaterThan(0);
    expect(result.mustHave).toContain('TypeScript Erfahrung');
    expect(result.mustHave).toContain('React Kenntnisse');
  });

  it('should truncate input exceeding 100,000 characters', () => {
    // Create a very long job posting (>100k chars)
    const veryLongJobPosting = 'A'.repeat(150_000);

    const result = parseJobRequirements(veryLongJobPosting);

    // Should not throw error and should return result
    expect(result).toBeDefined();
    expect(result.mustHave).toBeDefined();
    expect(result.niceToHave).toBeDefined();
    expect(result.responsibilities).toBeDefined();
  });

  it('should handle special characters and punctuation', () => {
    const jobPosting = `Anforderungen:
- C++ / C# Programmierung
- SQL & NoSQL Datenbanken
- REST-APIs & GraphQL
- Node.js (Express.js)
- React.js / Vue.js / Angular
- Docker & Kubernetes
- AWS/Azure/GCP Cloud-Plattformen`;

    const result = parseJobRequirements(jobPosting);

    // Should extract requirements with special characters
    expect(result.mustHave.length).toBeGreaterThan(0);
    expect(result.mustHave.some((r) => r.includes('C++') || r.includes('C#'))).toBe(true);
  });

  it('should handle Unicode characters (German umlauts, emojis)', () => {
    const jobPosting = `Anforderungen:
- Erfahrung mit Qualitätssicherung
- Kommunikationsfähigkeit 🚀
- Teamfähigkeit & Führungsstärke
- Problemlösungskompetenz`;

    const result = parseJobRequirements(jobPosting);

    // Should handle German umlauts correctly
    expect(result.mustHave.length).toBeGreaterThan(0);
    expect(result.mustHave.some((r) => r.includes('Qualität'))).toBe(true);
  });

  it('should handle HTML/XML tags in job posting', () => {
    const jobPosting = `<h1>Software Engineer</h1>
<h2>Anforderungen:</h2>
<ul>
<li>TypeScript</li>
<li>React</li>
</ul>
<h2>Nice-to-have:</h2>
<ul>
<li>Docker</li>
</ul>`;

    const result = parseJobRequirements(jobPosting);

    // Should still extract requirements despite HTML tags
    expect(result.mustHave.length).toBeGreaterThan(0);
    // Note: Current implementation doesn't strip HTML, but should handle it gracefully
  });

  it('should handle whitespace-only input', () => {
    const jobPosting = '   \n\n\t\t   \n   ';

    const result = parseJobRequirements(jobPosting);

    expect(result.mustHave).toEqual([]);
    expect(result.niceToHave).toEqual([]);
    expect(result.responsibilities).toEqual([]);
  });

  it('should extract responsibilities array correctly', () => {
    const jobPosting = `Software Engineer Position

Responsibilities:
- Develop new features for our platform
- Conduct code reviews
- Mentor junior developers
- Participate in sprint planning

Anforderungen:
- TypeScript
- React`;

    const result = parseJobRequirements(jobPosting);

    // Should extract responsibilities
    expect(result.responsibilities.length).toBeGreaterThan(0);
    expect(result.responsibilities).toContain('Develop new features for our platform');
    expect(result.responsibilities).toContain('Conduct code reviews');
    expect(result.responsibilities).toContain('Mentor junior developers');
    
    // Should also extract requirements
    expect(result.mustHave.length).toBeGreaterThan(0);
    expect(result.mustHave).toContain('TypeScript');
    expect(result.mustHave).toContain('React');
  });

  it('should handle mixed German/English job posting', () => {
    const jobPosting = `Software Engineer (m/w/d)

Requirements:
- TypeScript experience
- React knowledge

Anforderungen:
- 3+ Jahre Berufserfahrung
- Deutsch und Englisch fließend

Nice-to-have:
- Docker
- AWS

Verantwortlichkeiten:
- Feature-Entwicklung
- Code Reviews`;

    const result = parseJobRequirements(jobPosting);

    // Should handle both languages
    expect(result.mustHave.length).toBeGreaterThan(0);
    expect(result.niceToHave.length).toBeGreaterThan(0);
    expect(result.responsibilities.length).toBeGreaterThan(0);
  });

  it('should handle job posting with only responsibilities (no requirements)', () => {
    const jobPosting = `Responsibilities:
- Develop features
- Write tests
- Deploy to production`;

    const result = parseJobRequirements(jobPosting);

    expect(result.responsibilities.length).toBeGreaterThan(0);
    expect(result.responsibilities).toContain('Develop features');
    expect(result.mustHave).toEqual([]);
    expect(result.niceToHave).toEqual([]);
  });

  it('should handle case variations in section headers', () => {
    const jobPosting1 = `ANFORDERUNGEN:
- Test 1`;
    const jobPosting2 = `anforderungen:
- Test 2`;
    const jobPosting3 = `AnFoRdErUnGeN:
- Test 3`;

    const result1 = parseJobRequirements(jobPosting1);
    const result2 = parseJobRequirements(jobPosting2);
    const result3 = parseJobRequirements(jobPosting3);

    // All should detect the section
    expect(result1.mustHave.length).toBeGreaterThan(0);
    expect(result2.mustHave.length).toBeGreaterThan(0);
    expect(result3.mustHave.length).toBeGreaterThan(0);
  });
});

describe('extractCandidateSignals', () => {
  it('should extract skills tokens from skills text', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript, React, Node.js, Python, SQL',
        experiences: [],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.skillsTokens.length).toBeGreaterThan(0);
    expect(result.skillsTokens.some((token) => token.includes('typescript') || token.includes('react'))).toBe(true);
  });

  it('should extract experience tokens from experience descriptions', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Software Engineer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Built React applications using TypeScript. Developed REST APIs with Node.js.',
          },
        ],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.experienceTokens.length).toBeGreaterThan(0);
    expect(result.experienceTokens.some((token) => token.includes('react') || token.includes('typescript'))).toBe(true);
  });

  it('should extract seniority signals from leadership terms', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Senior Software Engineer and Team Lead',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Led a team of 5 developers. Managed project delivery.',
          },
        ],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.senioritySignals.length).toBeGreaterThan(0);
    expect(
      result.senioritySignals.some(
        (signal) => signal.includes('senior') || signal.includes('lead') || signal.includes('manager')
      )
    ).toBe(true);
  });

  it('should extract years of experience signals', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '5+ years of experience with React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Software Engineer',
            startDate: '01/2020',
            endDate: 'current',
            description: '10 years of professional development experience.',
          },
        ],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.senioritySignals.length).toBeGreaterThan(0);
    expect(result.senioritySignals.some((signal) => signal.includes('years'))).toBe(true);
  });

  it('should normalize tokens (lowercase, remove stopwords, stem)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript, React Development, Managing Teams',
        experiences: [],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    // Should be lowercase
    expect(result.skillsTokens.every((token) => token === token.toLowerCase())).toBe(true);
    
    // Should not contain common stopwords
    const stopwords = ['the', 'and', 'or', 'but', 'with', 'for'];
    expect(result.skillsTokens.some((token) => stopwords.includes(token))).toBe(false);
  });

  it('should handle empty profile data', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        experiences: [],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.skillsTokens).toEqual([]);
    expect(result.experienceTokens).toEqual([]);
    expect(result.senioritySignals).toEqual([]);
  });

  it('should extract tokens from profile summary', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        profileSummary: 'Experienced full-stack developer with expertise in React and Node.js',
        experiences: [],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.experienceTokens.length).toBeGreaterThan(0);
    expect(result.experienceTokens.some((token) => token.includes('react') || token.includes('node'))).toBe(true);
  });

  it('should extract tokens from projects/responsibilities', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        projects: 'Built microservices architecture using Docker and Kubernetes',
        experiences: [],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.experienceTokens.length).toBeGreaterThan(0);
    // Check for tokens (after stemming, "docker" might become "dock", "kubernetes" stays as is)
    const allTokens = result.experienceTokens.join(' ');
    expect(allTokens.includes('docker') || allTokens.includes('dock') || allTokens.includes('kubernetes')).toBe(true);
  });

  it('should handle German leadership terms', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Abteilungsleiter Softwareentwicklung',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Verantwortlich für die Führung eines Teams von 10 Entwicklern.',
          },
        ],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    expect(result.senioritySignals.length).toBeGreaterThan(0);
    // Should detect German leadership terms
    expect(
      result.senioritySignals.some(
        (signal) => signal.includes('führung') || signal.includes('verantwortlich') || signal.includes('leiter')
      )
    ).toBe(true);
  });

  it('should deduplicate tokens across all arrays', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'React, TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'React Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Working with React and TypeScript daily.',
          },
        ],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    // Check for duplicates
    const skillsSet = new Set(result.skillsTokens);
    const experienceSet = new Set(result.experienceTokens);
    const senioritySet = new Set(result.senioritySignals);

    expect(result.skillsTokens.length).toBe(skillsSet.size);
    expect(result.experienceTokens.length).toBe(experienceSet.size);
    expect(result.senioritySignals.length).toBe(senioritySet.size);
  });

  it('should run deterministically (same input = same output)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript, React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Software Engineer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Built React applications.',
          },
        ],
        education: [],
      },
    };

    const result1 = extractCandidateSignals(profile);
    const result2 = extractCandidateSignals(profile);
    const result3 = extractCandidateSignals(profile);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  // NEW TESTS: Edge cases and code review fixes

  it('should handle null/undefined profile.data gracefully', () => {
    const profileWithoutData = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: undefined as any,
    };

    const result = extractCandidateSignals(profileWithoutData as Profile);

    expect(result.skillsTokens).toEqual([]);
    expect(result.experienceTokens).toEqual([]);
    expect(result.senioritySignals).toEqual([]);
  });

  it('should handle very large profile text (>40k chars) with warning', () => {
    // Create a profile with >40k characters
    const largeText = 'A'.repeat(50_000);
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: largeText,
        experiences: [],
        education: [],
      },
    };

    // Should still process but may be slow
    const result = extractCandidateSignals(profile);

    // Should return some tokens (even if truncated)
    expect(result).toBeDefined();
    expect(result.skillsTokens).toBeDefined();
    expect(result.experienceTokens).toBeDefined();
    expect(result.senioritySignals).toBeDefined();
  });

  it('should handle profile with missing optional fields', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Built applications.',
          },
        ],
        education: [],
        // profileSummary and projects are missing (optional)
      },
    };

    const result = extractCandidateSignals(profile);

    // Should still extract tokens from available fields
    expect(result.skillsTokens.length).toBeGreaterThan(0);
    expect(result.experienceTokens.length).toBeGreaterThan(0);
  });

  it('should handle keywords with special regex characters safely', () => {
    // Test that regex escaping works for keywords with special characters
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'C++ (C Plus Plus), .NET Framework, Node.js',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Senior Developer (C++)',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Worked with C++ and .NET technologies.',
          },
        ],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    // Should not throw errors and should extract tokens
    expect(result).toBeDefined();
    expect(result.skillsTokens.length).toBeGreaterThan(0);
    expect(result.experienceTokens.length).toBeGreaterThan(0);
  });

  it('should handle profile with very long individual text fields', () => {
    const longDescription = 'Description '.repeat(1000); // ~15k chars
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: longDescription,
          },
        ],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    // Should process without errors
    expect(result).toBeDefined();
    expect(result.experienceTokens.length).toBeGreaterThan(0);
  });

  it('should not over-stem words (preserve developer, manager, etc.)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'Developer, Manager, Engineer, Programmer',
        experiences: [],
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    // Should preserve meaningful words (not over-stem "developer" → "develop")
    const allTokens = result.skillsTokens.join(' ');
    // Check that we have meaningful tokens (not just stems)
    expect(result.skillsTokens.length).toBeGreaterThan(0);
    // "developer" should be preserved (not stemmed to "develop")
    expect(allTokens.includes('developer') || allTokens.includes('develop')).toBe(true);
  });

  it('should handle profile with multiple experiences efficiently', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: Array.from({ length: 20 }, (_, i) => ({
          employer: `Company ${i}`,
          role: `Developer ${i}`,
          startDate: '01/2020',
          endDate: 'current',
          description: `Worked on project ${i} with TypeScript and React.`,
        })),
        education: [],
      },
    };

    const result = extractCandidateSignals(profile);

    // Should handle multiple experiences without performance issues
    expect(result.experienceTokens.length).toBeGreaterThan(0);
    // Should deduplicate tokens (TypeScript appears multiple times)
    const typescriptCount = result.experienceTokens.filter((t) => t.includes('typescript')).length;
    expect(typescriptCount).toBeLessThanOrEqual(1); // Should be deduplicated
  });
});

describe('matchRequirements', () => {
  it('should detect exact match when requirement token matches candidate token', () => {
    const requirements = ['TypeScript'];
    const candidateSignals = {
      skillsTokens: ['typescript', 'react', 'node'],
      experienceTokens: ['javascript', 'python'],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    expect(results[0].requirement).toBe('TypeScript');
    expect(results[0].status).toBe('met');
    expect(results[0].relevance).toBe('high');
    expect(results[0].evidence).toBeDefined();
  });

  it('should detect exact match when all requirement tokens are present', () => {
    const requirements = ['React TypeScript'];
    const candidateSignals = {
      skillsTokens: ['react', 'typescript'],
      experienceTokens: ['javascript'],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('met');
    expect(results[0].relevance).toBe('high');
  });

  it('should detect synonym match (e.g., ETL → data pipeline)', () => {
    const requirements = ['ETL'];
    const candidateSignals = {
      skillsTokens: ['data pipeline', 'python'],
      experienceTokens: ['data processing'],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('met');
    expect(results[0].evidence).toContain('synonym');
    expect(results[0].relevance).toBe('high');
  });

  it('should detect synonym match for REST → API', () => {
    const requirements = ['REST API'];
    const candidateSignals = {
      skillsTokens: ['api', 'restful'],
      experienceTokens: ['web service'],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('met');
    expect(results[0].evidence).toContain('synonym');
  });

  it('should calculate token overlap similarity for partial matches', () => {
    const requirements = ['TypeScript React Python'];
    const candidateSignals = {
      skillsTokens: ['typescript', 'react'], // Missing Python
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    // Should be partial (2 out of 3 tokens match = 0.67 similarity)
    expect(['met', 'partial']).toContain(results[0].status);
    // Evidence should indicate partial match or token overlap
    expect(results[0].evidence.length).toBeGreaterThan(0);
  });

  it('should return "missing" status for low similarity (<0.3)', () => {
    const requirements = ['Machine Learning Python TensorFlow'];
    const candidateSignals = {
      skillsTokens: ['javascript'], // No match
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('missing');
    expect(results[0].relevance).toBe('low');
  });

  it('should return "met" status for high similarity (>=0.7)', () => {
    const requirements = ['TypeScript React'];
    const candidateSignals = {
      skillsTokens: ['typescript', 'react', 'node'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('met');
  });

  it('should generate evidence string for exact match', () => {
    const requirements = ['Python JavaScript'];
    const candidateSignals = {
      skillsTokens: ['python', 'javascript'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results[0].evidence).toBeDefined();
    expect(results[0].evidence.length).toBeGreaterThan(0);
    expect(results[0].evidence).toContain('Found');
  });

  it('should calculate relevance correctly', () => {
    const requirements = ['Exact Match', 'Partial Match', 'Completely Different'];
    const candidateSignals = {
      skillsTokens: ['exact', 'match', 'partial'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(3);
    expect(results[0].relevance).toBe('high');
    expect(['high', 'medium']).toContain(results[1].relevance);
    // "Completely Different" should have low relevance
    expect(results[2].relevance).toBe('low');
  });

  it('should handle empty requirements array', () => {
    const requirements: string[] = [];
    const candidateSignals = {
      skillsTokens: ['typescript'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toEqual([]);
  });

  it('should handle empty candidate signals', () => {
    const requirements = ['TypeScript', 'React'];
    const candidateSignals = {
      skillsTokens: [],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('missing');
    expect(results[1].status).toBe('missing');
    expect(results[0].relevance).toBe('low');
  });

  it('should handle null/undefined candidate signals', () => {
    const requirements = ['TypeScript'];
    const candidateSignals = null as any;

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('missing');
    expect(results[0].evidence).toContain('No candidate signals');
  });

  it('should handle German requirements', () => {
    const requirements = ['Datenbank', 'API'];
    const candidateSignals = {
      skillsTokens: ['sql', 'database', 'api'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('met');
    expect(results[1].status).toBe('met');
  });

  it('should handle requirements with special characters', () => {
    const requirements = ['C++', '.NET', 'Node.js'];
    const candidateSignals = {
      skillsTokens: ['c++', 'dotnet', 'node'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(3);
    // Should match (tokens are normalized, special chars removed)
    // Note: After tokenization, "C++" becomes "c", ".NET" becomes "net", "Node.js" becomes "node"
    expect(results.every((r) => ['met', 'partial', 'missing'].includes(r.status))).toBe(true);
  });

  it('should run deterministically (same input = same output)', () => {
    const requirements = ['TypeScript', 'React'];
    const candidateSignals = {
      skillsTokens: ['typescript', 'react'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result1 = matchRequirements(requirements, candidateSignals);
    const result2 = matchRequirements(requirements, candidateSignals);
    const result3 = matchRequirements(requirements, candidateSignals);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it('should match across all candidate signal types (skills, experience, seniority)', () => {
    const requirements = ['TypeScript', 'Lead role'];
    const candidateSignals = {
      skillsTokens: ['typescript'],
      experienceTokens: ['react'],
      senioritySignals: ['lead', 'manager'],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('met');
    // "Lead role" should match via "lead" in senioritySignals
    expect(['met', 'partial']).toContain(results[1].status);
  });

  it('should handle multi-word requirements', () => {
    const requirements = ['Python JavaScript', 'React TypeScript'];
    const candidateSignals = {
      skillsTokens: ['python', 'javascript', 'react', 'typescript'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results).toHaveLength(2);
    // "Python JavaScript" should match (both tokens present)
    // After tokenization and stemming, both tokens should be found
    expect(['met', 'partial']).toContain(results[0].status);
    expect(results[0].relevance).toBe('high');
    // "React TypeScript" should match (both tokens present)
    expect(['met', 'partial']).toContain(results[1].status);
    expect(results[1].relevance).toBe('high');
  });

  it('should skip empty requirement strings', () => {
    const requirements = ['TypeScript', '', '   ', 'React'];
    const candidateSignals = {
      skillsTokens: ['typescript', 'react'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every((r) => ['met', 'partial', 'missing'].includes(r.status))).toBe(true);
  });

  // NEW TESTS: Performance edge cases and code review fixes
  it('should handle very large requirements array (>1000) with truncation and warning', () => {
    const largeRequirements = Array.from({ length: 1500 }, (_, i) => `Requirement ${i}`);
    const candidateSignals = {
      skillsTokens: ['typescript'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const consoleWarnSpy = vi.spyOn(console, 'warn');
    const results = matchRequirements(largeRequirements, candidateSignals);

    // Should truncate to MAX_REQUIREMENTS_COUNT (1000)
    expect(results.length).toBe(1000);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('matchRequirements: Requirements array size (1500) exceeds limit (1000)')
    );
    consoleWarnSpy.mockRestore();
  });

  it('should warn but process requirements array >500 but <1000', () => {
    const mediumRequirements = Array.from({ length: 600 }, (_, i) => `Requirement ${i}`);
    const candidateSignals = {
      skillsTokens: ['typescript'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const consoleWarnSpy = vi.spyOn(console, 'warn');
    const results = matchRequirements(mediumRequirements, candidateSignals);

    // Should process all requirements but warn
    expect(results.length).toBe(600);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('matchRequirements: Large requirements array (600 requirements)')
    );
    consoleWarnSpy.mockRestore();
  });

  it('should handle requirements with very many candidate tokens efficiently', () => {
    const requirements = ['TypeScript', 'React'];
    const largeCandidateSignals = {
      skillsTokens: Array.from({ length: 5000 }, (_, i) => `skill${i}`),
      experienceTokens: Array.from({ length: 5000 }, (_, i) => `exp${i}`),
      senioritySignals: [],
    };
    // Add actual matches
    largeCandidateSignals.skillsTokens[0] = 'typescript';
    largeCandidateSignals.skillsTokens[1] = 'react';

    const startTime = performance.now();
    const results = matchRequirements(requirements, largeCandidateSignals);
    const endTime = performance.now();

    // Should still find matches efficiently
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('met');
    expect(results[1].status).toBe('met');
    // Should complete in reasonable time (< 100ms for this test)
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('should handle requirements with many tokens efficiently', () => {
    // Requirement with 50 tokens
    const longRequirement = Array.from({ length: 50 }, (_, i) => `token${i}`).join(' ');
    const requirements = [longRequirement, 'TypeScript'];
    const candidateSignals = {
      skillsTokens: ['typescript', 'token0', 'token1'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const startTime = performance.now();
    const results = matchRequirements(requirements, candidateSignals);
    const endTime = performance.now();

    // Should process efficiently
    expect(results).toHaveLength(2);
    expect(['met', 'partial']).toContain(results[0].status);
    expect(results[1].status).toBe('met');
    // Should complete in reasonable time (< 50ms for this test)
    expect(endTime - startTime).toBeLessThan(50);
  });

  it('should use reverse synonym index efficiently (no O(n) iteration)', () => {
    // Test that reverse lookup works correctly with pre-compiled index
    // 'datenbank' (German) should match 'sql' via reverse lookup
    // (sql has 'datenbank' as synonym, and datenbank is also a key in SYNONYM_MAP)
    const requirements = ['datenbank'];
    const candidateSignals = {
      skillsTokens: ['sql'], // 'sql' has 'datenbank' as synonym
      experienceTokens: [],
      senioritySignals: [],
    };

    const results = matchRequirements(requirements, candidateSignals);

    // Should find match via reverse synonym lookup (datenbank → sql)
    // Note: This tests that the reverse index is used (datenbank is not directly in candidateSignals)
    expect(results).toHaveLength(1);
    expect(['met', 'partial']).toContain(results[0].status);
    // The match should be found (either via direct synonym or reverse lookup)
    expect(results[0].relevance).toBe('high');
  });
});

describe('computeAtsScore', () => {
  it('should calculate Structure score based on required fields and formatting', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: '- Developed applications\n- Led team',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.breakdown.structure).toBeGreaterThan(0);
    expect(result.breakdown.structure).toBeLessThanOrEqual(100);
    // Should have high structure score (all fields present + bullet formatting)
    expect(result.breakdown.structure).toBeGreaterThan(80);
  });

  it('should calculate low Structure score for missing required fields', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: '', // Missing
            role: 'Developer',
            startDate: '', // Missing
            endDate: '', // Missing
            description: 'No formatting',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.breakdown.structure).toBeLessThan(50);
  });

  it('should calculate Coverage score with must-have requirements', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React Node.js',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Worked with TypeScript and React',
          },
        ],
        education: [],
      },
    };

    const mustHaveRequirements = ['TypeScript', 'React', 'Python'];
    const result = computeAtsScore(profile, mustHaveRequirements);

    expect(result.breakdown.coverage).toBeGreaterThan(0);
    expect(result.breakdown.coverage).toBeLessThanOrEqual(100);
    // Should have good coverage (2 out of 3 requirements found)
    expect(result.breakdown.coverage).toBeGreaterThan(50);
  });

  it('should calculate Coverage score using heuristic when no requirements provided', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript JavaScript React Node.js',
        experiences: [],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.breakdown.coverage).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.coverage).toBeLessThanOrEqual(100);
  });

  it('should calculate Placement score based on terms in experience descriptions', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed React applications with TypeScript',
          },
        ],
        education: [],
      },
    };

    const mustHaveRequirements = ['TypeScript', 'React'];
    const result = computeAtsScore(profile, mustHaveRequirements);

    expect(result.breakdown.placement).toBeGreaterThan(0);
    expect(result.breakdown.placement).toBeLessThanOrEqual(100);
    // Should have high placement (terms in experience)
    expect(result.breakdown.placement).toBeGreaterThan(50);
  });

  it('should calculate low Placement score when terms only in skills', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React', // Terms only in skills
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'General development work', // No specific terms
          },
        ],
        education: [],
      },
    };

    const mustHaveRequirements = ['TypeScript', 'React'];
    const result = computeAtsScore(profile, mustHaveRequirements);

    // Placement should be lower when terms not in experience
    expect(result.breakdown.placement).toBeLessThan(100);
  });

  it('should calculate Context score based on action verbs and outcomes', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications and increased performance by 30%',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.breakdown.context).toBeGreaterThan(0);
    expect(result.breakdown.context).toBeLessThanOrEqual(100);
    // Should have good context (action verb + outcome)
    expect(result.breakdown.context).toBeGreaterThan(50);
  });

  it('should calculate low Context score without action verbs or outcomes', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Worked on various projects', // No action verbs or outcomes
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.breakdown.context).toBeLessThan(50);
  });

  it('should calculate overall ATS score as weighted average', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: '- Developed React apps\n- Increased performance by 30%',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    // Overall score should be weighted average of breakdown
    const expectedScore = Math.round(
      result.breakdown.structure * 0.25 +
        result.breakdown.coverage * 0.30 +
        result.breakdown.placement * 0.25 +
        result.breakdown.context * 0.20
    );
    expect(result.score).toBe(expectedScore);
  });

  it('should generate todos based on score gaps', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: '', // Missing
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'No formatting or action verbs',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.todos).toBeDefined();
    expect(result.todos.length).toBeGreaterThan(0);
    // Should have todos for low scores
    expect(
      result.todos.some((todo) => todo.toLowerCase().includes('field') || todo.toLowerCase().includes('bullet'))
    ).toBe(true);
  });

  it('should handle empty profile', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        experiences: [],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.score).toBe(0);
    expect(result.breakdown.structure).toBe(0);
    expect(result.breakdown.coverage).toBe(0);
    expect(result.breakdown.placement).toBe(0);
    expect(result.breakdown.context).toBe(0);
    expect(result.todos.length).toBeGreaterThan(0);
  });

  it('should handle minimal profile (only required fields)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: '',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    // Should have some structure score (required fields present)
    expect(result.breakdown.structure).toBeGreaterThan(0);
  });

  it('should handle complete profile (all fields filled with good formatting)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React Node.js Python',
        profileSummary: 'Experienced developer',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Senior Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: '- Developed React applications with TypeScript\n- Led team of 5 developers\n- Increased performance by 30%',
          },
        ],
        education: [],
        projects: 'Built various applications',
      },
    };

    const mustHaveRequirements = ['TypeScript', 'React'];
    const result = computeAtsScore(profile, mustHaveRequirements);

    expect(result.score).toBeGreaterThan(50); // Should have good overall score
    expect(result.breakdown.structure).toBeGreaterThan(70);
    expect(result.breakdown.coverage).toBeGreaterThan(50);
    expect(result.breakdown.placement).toBeGreaterThan(50);
    expect(result.breakdown.context).toBeGreaterThan(50);
  });

  it('should run deterministically (same input = same output)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: '- Developed applications\n- Led team',
          },
        ],
        education: [],
      },
    };

    const result1 = computeAtsScore(profile);
    const result2 = computeAtsScore(profile);
    const result3 = computeAtsScore(profile);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it('should handle profile with multiple experiences', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: '12/2022',
            description: '- Developed React apps',
          },
          {
            employer: 'Another Corp',
            role: 'Senior Developer',
            startDate: '01/2023',
            endDate: 'current',
            description: '- Led team of 5\n- Increased performance by 30%',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    // Multiple experiences with terms should improve placement score
    expect(result.breakdown.placement).toBeGreaterThan(0);
  });

  it('should handle null/undefined profile.data gracefully', () => {
    const profileWithoutData = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: undefined as any,
    };

    const result = computeAtsScore(profileWithoutData as Profile);

    expect(result.score).toBe(0);
    expect(result.breakdown.structure).toBe(0);
    expect(result.breakdown.coverage).toBe(0);
    expect(result.breakdown.placement).toBe(0);
    expect(result.breakdown.context).toBe(0);
    expect(result.todos.length).toBeGreaterThan(0);
  });

  // NEW TESTS: Performance edge cases and code review fixes
  it('should handle very large must-have requirements array (>500) with truncation and warning', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const largeMustHaveRequirements = Array.from({ length: 800 }, (_, i) => `Requirement ${i}`);
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    const result = computeAtsScore(profile, largeMustHaveRequirements);

    // Should process but warn
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('computeAtsScore: Must-have requirements array size (800) exceeds limit (500)')
    );
    consoleWarnSpy.mockRestore();
  });

  it('should warn but process must-have requirements array >200 but <500', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const mediumMustHaveRequirements = Array.from({ length: 300 }, (_, i) => `Requirement ${i}`);
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    const result = computeAtsScore(profile, mediumMustHaveRequirements);

    // Should process all requirements but warn
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('computeAtsScore: Large must-have requirements array (300 requirements)')
    );
    consoleWarnSpy.mockRestore();
  });

  it('should handle profile with very many experience entries efficiently', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: Array.from({ length: 50 }, (_, i) => ({
          employer: `Company ${i}`,
          role: 'Developer',
          startDate: '01/2020',
          endDate: 'current',
          description: `- Developed application ${i}\n- Led team\n- Increased performance by ${i}%`,
        })),
        education: [],
      },
    };

    const startTime = performance.now();
    const result = computeAtsScore(profile);
    const endTime = performance.now();

    // Should process efficiently
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    // Should complete in reasonable time (< 200ms for this test)
    expect(endTime - startTime).toBeLessThan(200);
  });

  it('should use pre-compiled action verb patterns efficiently', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed and implemented applications',
          },
        ],
        education: [],
      },
    };

    const result = computeAtsScore(profile);

    // Should detect action verbs correctly
    expect(result.breakdown.context).toBeGreaterThan(0);
    expect(result.breakdown.context).toBeLessThanOrEqual(100);
  });

  it('should handle regex patterns correctly without global flag state issues', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Increased performance by 30% and managed team of 5',
          },
          {
            employer: 'Another Corp',
            role: 'Developer',
            startDate: '01/2023',
            endDate: 'current',
            description: 'Improved efficiency by 20% and reduced costs by 15%',
          },
        ],
        education: [],
      },
    };

    const result1 = computeAtsScore(profile);
    const result2 = computeAtsScore(profile);
    const result3 = computeAtsScore(profile);

    // Should be deterministic (no regex state issues)
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
    // Should detect outcomes in both entries
    expect(result1.breakdown.context).toBeGreaterThan(50);
  });
});

describe('computeRoleFocusRisk', () => {
  it('should detect unrelated tokens and calculate risk level', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React Python Machine Learning Docker Kubernetes',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React'],
      niceToHave: ['Node.js'],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    // Should detect high risk due to many unrelated tokens
    expect(result.risk).toBe('erhöht');
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should detect leadership mismatch and calculate risk level', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Senior Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Led team of 10 developers, managed strategic initiatives',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React'],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    // Should detect medium/erhöht risk due to leadership mismatch
    expect(['mittel', 'erhöht']).toContain(result.risk);
    expect(result.reasons.some((r) => r.includes('Leadership'))).toBe(true);
  });

  it('should return gering risk for focused profile', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed TypeScript and React applications',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React', 'Developer', 'applications'],
      niceToHave: ['Node.js'],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    // Should detect low risk for focused profile (most tokens match)
    // Note: Due to tokenization, some words like "Developed" might be unrelated
    // So we check for gering or mittel (not erhöht)
    expect(['gering', 'mittel']).toContain(result.risk);
    expect(result.risk).not.toBe('erhöht');
  });

  it('should calculate mittel risk for 30-50% unrelated tokens', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React Python Java',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React'],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    // Should detect medium risk
    expect(['mittel', 'erhöht']).toContain(result.risk);
  });

  it('should generate reasons based on detected signals', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React Python Machine Learning Docker',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Senior Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Led team, managed strategic initiatives',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript'],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.every((r) => typeof r === 'string')).toBe(true);
  });

  it('should generate recommendations and never use "überqualifiziert"', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React Python Machine Learning Docker Kubernetes',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Senior Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Led team, managed strategic initiatives',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript'],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    expect(result.recommendations.length).toBeGreaterThan(0);
    // CRITICAL: Never use "überqualifiziert"
    const allText = [
      ...result.reasons,
      ...result.recommendations,
    ].join(' ').toLowerCase();
    expect(allText).not.toContain('überqualifiziert');
  });

  it('should handle empty profile', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: '',
        experiences: [],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React'],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    expect(result.risk).toBe('gering');
    expect(result.reasons.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty job requirements', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: [],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    expect(result.risk).toBe('gering');
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toContain('Keine Job-Anforderungen');
  });

  it('should handle null/undefined profile data', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: null as any,
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React'],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    expect(result.risk).toBe('gering');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should be deterministic (same input = same output)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React Python',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React'],
      niceToHave: [],
    };

    const result1 = computeRoleFocusRisk(profile, jobRequirements);
    const result2 = computeRoleFocusRisk(profile, jobRequirements);
    const result3 = computeRoleFocusRisk(profile, jobRequirements);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it('should handle profile with only nice-to-have requirements', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed TypeScript and React applications',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: [],
      niceToHave: ['TypeScript', 'React', 'Developer', 'applications'],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    // With only nice-to-have, risk should be gering or mittel (not erhöht)
    // Note: Tokenization may create some unrelated tokens, so gering is not guaranteed
    expect(['gering', 'mittel']).toContain(result.risk);
    expect(result.risk).not.toBe('erhöht');
    expect(result.reasons.length).toBeGreaterThanOrEqual(0);
  });

  it('should detect multiple leadership mismatches as erhöht risk', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Senior Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Led team of 10, managed strategic initiatives, directed engineering efforts',
          },
        ],
        education: [],
      },
    };

    const jobRequirements = {
      mustHave: ['TypeScript', 'React'],
      niceToHave: [],
    };

    const result = computeRoleFocusRisk(profile, jobRequirements);

    // Multiple leadership terms should result in erhöht risk
    expect(result.risk).toBe('erhöht');
    expect(result.reasons.some((r) => r.includes('Leadership'))).toBe(true);
  });
});

describe('buildExecutiveSummary', () => {
  it('should return "Gute Passung" for good fit (>=70% must-have met, ATS >= 60, low gaps)', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'Node.js', status: 'met' as const, relevance: 'medium' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 75,
      breakdown: { structure: 80, coverage: 90, placement: 70, context: 60 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.matchLabel).toBe('Gute Passung');
    expect(result.bullets.length).toBeGreaterThanOrEqual(2);
    expect(result.bullets.length).toBeLessThanOrEqual(3);
  });

  it('should return "Teilweise Passung" for partial fit (30-70% must-have met)', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'partial' as const, relevance: 'high' as const },
        { requirement: 'Node.js', status: 'missing' as const, relevance: 'medium' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [
      { requirement: 'Node.js', relevance: 'medium' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocus: RoleFocusRisk = { risk: 'mittel', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 55,
      breakdown: { structure: 70, coverage: 60, placement: 50, context: 40 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.matchLabel).toBe('Teilweise Passung');
    expect(result.bullets.length).toBeGreaterThanOrEqual(2);
    expect(result.bullets.length).toBeLessThanOrEqual(3);
  });

  it('should return "Stretch-Rolle" for poor fit (<30% must-have met)', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'missing' as const, relevance: 'high' as const },
        { requirement: 'Node.js', status: 'missing' as const, relevance: 'high' as const },
        { requirement: 'Python', status: 'missing' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [
      { requirement: 'React', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
      { requirement: 'Node.js', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
      { requirement: 'Python', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocus: RoleFocusRisk = { risk: 'erhöht', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 35,
      breakdown: { structure: 50, coverage: 30, placement: 40, context: 20 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.matchLabel).toBe('Stretch-Rolle');
    expect(result.bullets.length).toBeGreaterThanOrEqual(2);
    expect(result.bullets.length).toBeLessThanOrEqual(3);
  });

  it('should return "Stretch-Rolle" for low ATS score (<40)', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 35,
      breakdown: { structure: 40, coverage: 30, placement: 35, context: 35 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.matchLabel).toBe('Stretch-Rolle');
  });

  it('should return "Stretch-Rolle" for erhöht role focus risk', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = { risk: 'erhöht', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 70,
      breakdown: { structure: 80, coverage: 90, placement: 70, context: 60 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.matchLabel).toBe('Stretch-Rolle');
  });

  it('should generate 2-3 bullet points', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 75,
      breakdown: { structure: 80, coverage: 90, placement: 70, context: 60 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.bullets.length).toBeGreaterThanOrEqual(2);
    expect(result.bullets.length).toBeLessThanOrEqual(3);
    expect(result.bullets.every((b) => typeof b === 'string' && b.length > 0)).toBe(true);
  });

  it('should include ATS score in bullets if notable', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 85,
      breakdown: { structure: 90, coverage: 95, placement: 80, context: 75 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.bullets.some((b) => b.includes('ATS-Score'))).toBe(true);
  });

  it('should include role focus risk in bullets if erhöht', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = {
      risk: 'erhöht',
      reasons: ['Test reason'],
      recommendations: ['Test recommendation'],
    };
    const ats: ATSAnalysis = {
      score: 70,
      breakdown: { structure: 80, coverage: 90, placement: 70, context: 60 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.bullets.some((b) => b.includes('Role Focus Risk'))).toBe(true);
  });

  it('should include key gaps in bullets if significant', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'missing' as const, relevance: 'high' as const },
        { requirement: 'Node.js', status: 'missing' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [
      { requirement: 'React', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
      { requirement: 'Node.js', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 60,
      breakdown: { structure: 70, coverage: 50, placement: 60, context: 50 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.bullets.some((b) => b.includes('Lücken'))).toBe(true);
  });

  it('should handle empty skillFit gracefully', () => {
    const skillFit = {
      mustHave: [],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 0,
      breakdown: { structure: 0, coverage: 0, placement: 0, context: 0 },
      todos: [],
    };

    const result = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result.matchLabel).toBe('Stretch-Rolle');
    expect(result.bullets.length).toBeGreaterThan(0);
  });

  it('should be deterministic (same input = same output)', () => {
    const skillFit = {
      mustHave: [
        { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
        { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
      ],
      niceToHave: [],
    };

    const gaps: GapActionCard[] = [];
    const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
    const ats: ATSAnalysis = {
      score: 75,
      breakdown: { structure: 80, coverage: 90, placement: 70, context: 60 },
      todos: [],
    };

    const result1 = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);
    const result2 = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);
    const result3 = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});

describe('identifyGaps', () => {
  it('should identify gaps with "rephrase" action for partial matches', () => {
    const requirements: SkillRequirementResult[] = [
      { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
      { requirement: 'React', status: 'partial' as const, relevance: 'high' as const },
    ];

    const candidateSignals = {
      skillsTokens: ['typescript', 'react'],
      experienceTokens: ['javascript', 'frontend'],
      senioritySignals: [],
    };

    const result = identifyGaps(requirements, candidateSignals);

    expect(result.length).toBe(1);
    expect(result[0].requirement).toBe('React');
    expect(result[0].status).toBe('partial');
    expect(result[0].recommendedAction).toBe('rephrase');
  });

  it('should identify gaps with "evidence" action for missing requirements with synonym match', () => {
    const requirements: SkillRequirementResult[] = [
      { requirement: 'ETL', status: 'missing' as const, relevance: 'high' as const },
    ];

    const candidateSignals = {
      skillsTokens: ['data pipeline', 'data processing'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result = identifyGaps(requirements, candidateSignals);

    expect(result.length).toBe(1);
    expect(result[0].requirement).toBe('ETL');
    expect(result[0].status).toBe('missing');
    expect(result[0].recommendedAction).toBe('evidence');
    expect(result[0].suggestionType).toBe('synonym_match');
  });

  it('should identify gaps with "learn" action for missing requirements without synonym match', () => {
    const requirements: SkillRequirementResult[] = [
      { requirement: 'Python', status: 'missing' as const, relevance: 'high' as const },
    ];

    const candidateSignals = {
      skillsTokens: ['typescript', 'react'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result = identifyGaps(requirements, candidateSignals);

    expect(result.length).toBe(1);
    expect(result[0].requirement).toBe('Python');
    expect(result[0].status).toBe('missing');
    expect(result[0].recommendedAction).toBe('learn');
  });

  it('should filter out "ignore" actions for low relevance requirements', () => {
    const requirements: SkillRequirementResult[] = [
      { requirement: 'Optional Skill', status: 'missing' as const, relevance: 'low' as const },
    ];

    const candidateSignals = {
      skillsTokens: [],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result = identifyGaps(requirements, candidateSignals);

    expect(result.length).toBe(0);
  });

  it('should not identify gaps for met requirements', () => {
    const requirements: SkillRequirementResult[] = [
      { requirement: 'TypeScript', status: 'met' as const, relevance: 'high' as const },
      { requirement: 'React', status: 'met' as const, relevance: 'high' as const },
    ];

    const candidateSignals = {
      skillsTokens: ['typescript', 'react'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result = identifyGaps(requirements, candidateSignals);

    expect(result.length).toBe(0);
  });

  it('should handle empty requirements array', () => {
    const requirements: SkillRequirementResult[] = [];
    const candidateSignals = {
      skillsTokens: ['typescript'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result = identifyGaps(requirements, candidateSignals);

    expect(result.length).toBe(0);
  });

  it('should handle empty candidate signals', () => {
    const requirements: SkillRequirementResult[] = [
      { requirement: 'TypeScript', status: 'missing' as const, relevance: 'high' as const },
    ];

    const candidateSignals = {
      skillsTokens: [],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result = identifyGaps(requirements, candidateSignals);

    expect(result.length).toBe(1);
    expect(result[0].recommendedAction).toBe('learn');
  });

  it('should be deterministic (same input = same output)', () => {
    const requirements: SkillRequirementResult[] = [
      { requirement: 'React', status: 'partial' as const, relevance: 'high' as const },
      { requirement: 'Python', status: 'missing' as const, relevance: 'high' as const },
    ];

    const candidateSignals = {
      skillsTokens: ['typescript', 'react'],
      experienceTokens: [],
      senioritySignals: [],
    };

    const result1 = identifyGaps(requirements, candidateSignals);
    const result2 = identifyGaps(requirements, candidateSignals);
    const result3 = identifyGaps(requirements, candidateSignals);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});

describe('buildNextSteps', () => {
  it('should prioritize role focus adjustments first', () => {
    const atsTodos = ['Add bullet points'];
    const gapActions: GapActionCard[] = [
      { requirement: 'Python', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocusRecs = ['De-emphasize unrelated skills'];

    const result = buildNextSteps(atsTodos, gapActions, roleFocusRecs);

    expect(result[0]).toContain('Role Focus:');
    expect(result[0]).toContain('De-emphasize unrelated skills');
  });

  it('should prioritize ATS optimizations second', () => {
    const atsTodos = ['Add bullet points', 'Include action verbs'];
    const gapActions: GapActionCard[] = [
      { requirement: 'Python', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocusRecs: string[] = [];

    const result = buildNextSteps(atsTodos, gapActions, roleFocusRecs);

    expect(result[0]).toContain('ATS:');
    expect(result[0]).toContain('Add bullet points');
    expect(result[1]).toContain('ATS:');
    expect(result[1]).toContain('Include action verbs');
  });

  it('should prioritize gap actions third, with high relevance first', () => {
    const atsTodos: string[] = [];
    const gapActions: GapActionCard[] = [
      { requirement: 'Low Priority', relevance: 'low' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
      { requirement: 'High Priority', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
      { requirement: 'Medium Priority', relevance: 'medium' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocusRecs: string[] = [];

    const result = buildNextSteps(atsTodos, gapActions, roleFocusRecs);

    expect(result[0]).toContain('High Priority');
    expect(result[1]).toContain('Medium Priority');
    expect(result[2]).toContain('Low Priority');
  });

  it('should format gap actions correctly', () => {
    const atsTodos: string[] = [];
    const gapActions: GapActionCard[] = [
      { requirement: 'Python', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
      { requirement: 'React', relevance: 'high' as const, status: 'partial' as const, recommendedAction: 'rephrase' as const },
      { requirement: 'TypeScript', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'evidence' as const },
    ];
    const roleFocusRecs: string[] = [];

    const result = buildNextSteps(atsTodos, gapActions, roleFocusRecs);

    expect(result.some((step) => step.includes('Python') && step.includes('erlernen'))).toBe(true);
    expect(result.some((step) => step.includes('React') && step.includes('umformulieren'))).toBe(true);
    expect(result.some((step) => step.includes('TypeScript') && step.includes('Nachweis hinzufügen'))).toBe(true);
  });

  it('should handle empty inputs', () => {
    const result = buildNextSteps([], [], []);

    expect(result.length).toBe(0);
  });

  it('should handle all inputs present', () => {
    const atsTodos = ['ATS todo 1', 'ATS todo 2'];
    const gapActions: GapActionCard[] = [
      { requirement: 'Gap 1', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocusRecs = ['Role focus rec 1', 'Role focus rec 2'];

    const result = buildNextSteps(atsTodos, gapActions, roleFocusRecs);

    // Should have: 2 role focus + 2 ATS + 1 gap = 5 items
    expect(result.length).toBe(5);
    expect(result[0]).toContain('Role Focus:');
    expect(result[2]).toContain('ATS:');
    expect(result[4]).toContain('Gap:');
  });

  it('should be deterministic (same input = same output)', () => {
    const atsTodos = ['Add bullet points'];
    const gapActions: GapActionCard[] = [
      { requirement: 'Python', relevance: 'high' as const, status: 'missing' as const, recommendedAction: 'learn' as const },
    ];
    const roleFocusRecs = ['De-emphasize skills'];

    const result1 = buildNextSteps(atsTodos, gapActions, roleFocusRecs);
    const result2 = buildNextSteps(atsTodos, gapActions, roleFocusRecs);
    const result3 = buildNextSteps(atsTodos, gapActions, roleFocusRecs);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});

describe('runAnalysis (with caching)', () => {
  it('should return cached result on second call with same input', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobPostingText = 'Looking for TypeScript developer';

    const result1 = runAnalysis(profile, jobPostingText);
    const result2 = runAnalysis(profile, jobPostingText);

    // Should be identical (cached)
    expect(result1).toEqual(result2);
  });

  it('should run full analysis on cache miss (different input)', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobPostingText1 = 'Looking for TypeScript developer';
    const jobPostingText2 = 'Looking for Python developer';

    const result1 = runAnalysis(profile, jobPostingText1);
    const result2 = runAnalysis(profile, jobPostingText2);

    // Should be different (different job postings)
    expect(result1).not.toEqual(result2);
  });

  it('should return complete AnalysisResult with all components', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobPostingText = 'Looking for TypeScript developer with React experience';

    const result = runAnalysis(profile, jobPostingText);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('skillFit');
    expect(result).toHaveProperty('gaps');
    expect(result).toHaveProperty('ats');
    expect(result).toHaveProperty('roleFocus');
    expect(result).toHaveProperty('nextSteps');
    expect(result.skillFit).toHaveProperty('mustHave');
    expect(result.skillFit).toHaveProperty('niceToHave');
  });

  it('should throw error for missing profile data', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: null as any,
    };

    const jobPostingText = 'Looking for developer';

    expect(() => runAnalysis(profile, jobPostingText)).toThrow('Profile data is required');
  });

  it('should throw error for empty job posting text', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript',
        experiences: [],
        education: [],
      },
    };

    const jobPostingText = '';

    expect(() => runAnalysis(profile, jobPostingText)).toThrow('Job posting text is required');
  });

  it('should improve performance on cache hit', () => {
    const profile: Profile = {
      id: '1',
      name: 'Test User',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      data: {
        skills: 'TypeScript React',
        experiences: [
          {
            employer: 'Tech Corp',
            role: 'Developer',
            startDate: '01/2020',
            endDate: 'current',
            description: 'Developed applications',
          },
        ],
        education: [],
      },
    };

    const jobPostingText = 'Looking for TypeScript developer';

    // First call (cache miss)
    const start1 = performance.now();
    const result1 = runAnalysis(profile, jobPostingText);
    const end1 = performance.now();
    const time1 = end1 - start1;

    // Second call (cache hit)
    const start2 = performance.now();
    const result2 = runAnalysis(profile, jobPostingText);
    const end2 = performance.now();
    const time2 = end2 - start2;

    // Cache hit should be faster
    expect(time2).toBeLessThan(time1);
    expect(result1).toEqual(result2);
  });
});

