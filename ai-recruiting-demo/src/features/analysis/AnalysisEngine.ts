/**
 * Analysis Engine - Deterministic browser-only analysis functions
 * 
 * This module provides all analysis functions that run completely in the browser
 * without any external API calls. All functions are pure and deterministic.
 * 
 * Privacy-First: No CV/JD data is ever sent to servers (FR29, FR41, FR42)
 */

import type { Profile } from '../../types/profile.types';
import type { SkillRequirementResult, ATSAnalysis, ATSScoreBreakdown, RoleFocusRisk, ExecutiveSummary, GapActionCard, AnalysisResult } from '../../types/analysis.types';
import { createAnalysisHash } from '../../utils/hash';
import { trackAnalysis } from '../../services/statisticsService';

/**
 * Candidate signals type for gap identification.
 */
type CandidateSignals = {
  skillsTokens: string[];
  experienceTokens: string[];
  senioritySignals: string[];
};

/**
 * Section type detected from job posting text
 */
type SectionType = 'mustHave' | 'niceToHave' | 'responsibilities' | 'unknown';

/**
 * Detects section type from a line of text (case-insensitive).
 * 
 * Supports German and English keywords with variations (dashes, colons, whitespace).
 * 
 * @param line - Line of text to check for section header
 * @returns Detected section type or 'unknown' if no match
 */
function detectSectionType(line: string): SectionType {
  const normalized = line.trim().toLowerCase();
  
  // German and English keywords for must-have
  const mustHavePatterns = [
    /^anforderungen/i,
    /^must-have/i,
    /^must have/i,
    /^erforderlich/i,
    /^wir erwarten/i,
    /^voraussetzungen/i,
    /^requirements/i,
    /^required/i,
    /^we expect/i,
  ];
  
  // German and English keywords for nice-to-have
  const niceToHavePatterns = [
    /^nice-to-have/i,
    /^nice to have/i,
    /^wünschenswert/i,
    /^wunschkriterien/i,
    /^preferred/i,
    /^bonus/i,
    /^zusätzlich/i,
  ];
  
  // Responsibilities/description keywords
  const responsibilitiesPatterns = [
    /^aufgaben/i,
    /^verantwortlichkeiten/i,
    /^responsibilities/i,
    /^tätigkeiten/i,
    /^beschreibung/i,
  ];
  
  // Check for must-have patterns
  for (const pattern of mustHavePatterns) {
    if (pattern.test(normalized)) {
      return 'mustHave';
    }
  }
  
  // Check for nice-to-have patterns
  for (const pattern of niceToHavePatterns) {
    if (pattern.test(normalized)) {
      return 'niceToHave';
    }
  }
  
  // Check for responsibilities patterns
  for (const pattern of responsibilitiesPatterns) {
    if (pattern.test(normalized)) {
      return 'responsibilities';
    }
  }
  
  return 'unknown';
}

/**
 * Parses bullet-like lines from text and returns cleaned requirement strings.
 * 
 * Detects bullet markers: `-`, `*`, `•`, numbered lists (`1.`, `2.`), or indented lines.
 * Removes bullet markers, trims whitespace, and filters empty lines.
 * 
 * @param text - Text block to parse for bullet points
 * @returns Array of cleaned requirement strings
 */
function parseBulletPoints(text: string): string[] {
  const lines = text.split('\n');
  const requirements: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      continue;
    }
    
    // Detect bullet markers: -, *, •, or numbered lists (1., 2., etc.)
    const bulletPattern = /^[-*•]\s+(.+)$/;
    const numberedPattern = /^\d+\.\s+(.+)$/;
    
    let cleaned: string | null = null;
    
    // Check for standard bullet markers
    const bulletMatch = trimmed.match(bulletPattern);
    if (bulletMatch) {
      cleaned = bulletMatch[1].trim();
    } else {
      // Check for numbered lists
      const numberedMatch = trimmed.match(numberedPattern);
      if (numberedMatch) {
        cleaned = numberedMatch[1].trim();
      } else {
        // Check for indented lines (potential bullet points without explicit markers)
        // Consider lines that start with 2+ spaces as potential bullets
        if (line.length > trimmed.length && line.length - trimmed.length >= 2) {
          cleaned = trimmed;
        }
      }
    }
    
    // Add cleaned requirement if found
    if (cleaned && cleaned.length > 0) {
      requirements.push(cleaned);
    }
  }
  
  return requirements;
}

/**
 * Common stopwords in German and English to filter from n-grams
 * 
 * Expanded list to improve fallback extraction quality by filtering
 * more common words that don't contribute to requirement identification.
 */
const STOPWORDS = new Set([
  // German stopwords (expanded)
  'der', 'die', 'das', 'und', 'oder', 'aber', 'mit', 'von', 'zu', 'in', 'auf',
  'für', 'ist', 'sind', 'war', 'waren', 'wird', 'werden', 'hat', 'haben',
  'ein', 'eine', 'einer', 'eines', 'einem', 'einen', 'als', 'auch', 'nicht',
  'sich', 'dass', 'kann', 'können', 'muss', 'müssen', 'bei', 'nach', 'über',
  'durch', 'um', 'am', 'im', 'zum', 'zur', 'vom', 'beim', 'ans', 'aufs',
  'des', 'dem', 'den', 'wir', 'sie', 'er', 'es', 'ihr', 'du', 'ich',
  'sein', 'seine', 'seiner', 'seines', 'ihnen', 'uns', 'euch', 'dich', 'mich',
  'dieser', 'diese', 'dieses', 'jener', 'jene', 'jenes', 'welcher', 'welche',
  'alle', 'alles', 'einige', 'mehrere', 'viele', 'wenige', 'andere',
  'mehr', 'weniger', 'sehr', 'so', 'wie', 'wenn', 'dann', 'weil', 'da',
  'noch', 'nur', 'schon', 'bereits', 'immer', 'nie', 'oft', 'manchmal',
  
  // English stopwords (expanded)
  'the', 'a', 'an', 'and', 'or', 'but', 'with', 'from', 'to', 'in', 'on',
  'for', 'is', 'are', 'was', 'were', 'will', 'be', 'has', 'have', 'had',
  'as', 'also', 'not', 'can', 'must', 'should', 'would', 'could', 'may',
  'at', 'by', 'of', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'over', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'that', 'these',
  'those', 'this', 'what', 'which', 'who', 'whom', 'whose', 'if', 'because',
  'while', 'doing', 'been', 'being', 'does', 'did', 'having', 'do',
  'we', 'you', 'they', 'he', 'she', 'it', 'our', 'your', 'their', 'his',
  'her', 'its', 'my', 'me', 'him', 'them', 'us', 'myself', 'yourself',
  'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
]);

/**
 * Extracts n-grams (2-3 word phrases) from text and filters stopwords.
 * 
 * Used as fallback when no clear sections are detected in job posting.
 * Returns top lines (first 10-15 lines) as potential requirements.
 * 
 * Optimized for performance: Uses Set for deduplication and limits phrase generation.
 * 
 * @param text - Text to extract n-grams from
 * @returns Array of extracted phrases as mustHave requirements
 */
function extractFallbackRequirements(text: string): string[] {
  const lines = text.split('\n').slice(0, 15); // Top 15 lines
  const requirementsSet = new Set<string>(); // Use Set for O(1) deduplication
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines or very short lines
    if (!trimmed || trimmed.length < 10) {
      continue;
    }
    
    // Skip lines that look like headers (all caps, very short)
    if (trimmed.length < 30 && trimmed === trimmed.toUpperCase()) {
      continue;
    }
    
    // Extract words and filter stopwords
    const words = trimmed
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word));
    
    // Create 2-3 word phrases (n-grams)
    if (words.length >= 2) {
      // Extract 2-word phrases
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (phrase.length > 5) {
          requirementsSet.add(phrase);
        }
      }
      
      // Extract 3-word phrases (limited to avoid too many)
      if (words.length >= 3 && requirementsSet.size < 20) {
        for (let i = 0; i < words.length - 2; i++) {
          const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (phrase.length > 8) {
            requirementsSet.add(phrase);
          }
        }
      }
    }
    
    // Also add the original line if it's reasonable length and not too long
    if (trimmed.length >= 20 && trimmed.length < 200 && !trimmed.match(/^[-*•\d]/)) {
      requirementsSet.add(trimmed);
    }
  }
  
  // Return unique requirements, limited to top 30
  return Array.from(requirementsSet).slice(0, 30);
}

/**
 * Maximum allowed input length for job posting text (100,000 characters).
 * 
 * This limit prevents performance issues and potential memory problems
 * with extremely large inputs while still accommodating very long job postings.
 * 
 * Note: FR8 specifies 25k chars for job descriptions, but we allow 100k
 * to handle edge cases and future requirements.
 */
const MAX_INPUT_LENGTH = 100_000;

/**
 * Maximum allowed total profile text length (40,000 characters per FR8).
 * 
 * This limit prevents performance issues when processing very large profiles.
 * The total includes: profileSummary, all experience descriptions, education notes,
 * skills text, and projects text.
 */
const MAX_PROFILE_TEXT_LENGTH = 40_000;

/**
 * Maximum allowed number of requirements for matching (1,000 requirements).
 * 
 * This limit prevents performance issues when processing very large requirement lists.
 * Exceeding this limit may cause analysis to exceed NFR2 (< 2s runtime).
 * 
 * Note: Typical job postings have 10-50 requirements, so 1000 is a generous limit.
 */
const MAX_REQUIREMENTS_COUNT = 1_000;

/**
 * Warning threshold for requirements array size (500 requirements).
 * 
 * Arrays larger than this will trigger a console warning but processing continues.
 */
const REQUIREMENTS_WARNING_THRESHOLD = 500;

/**
 * Maximum allowed number of must-have requirements for ATS score calculation (500 requirements).
 * 
 * This limit prevents performance issues when processing very large requirement lists.
 * Exceeding this limit may cause analysis to exceed NFR2 (< 2s runtime).
 */
const MAX_MUST_HAVE_REQUIREMENTS_COUNT = 500;

/**
 * Warning threshold for must-have requirements array size (200 requirements).
 * 
 * Arrays larger than this will trigger a console warning but processing continues.
 */
const MUST_HAVE_REQUIREMENTS_WARNING_THRESHOLD = 200;

/**
 * Maximum allowed number of job requirements (must-have + nice-to-have) for role focus risk (500 requirements).
 * 
 * This limit prevents performance issues when processing very large requirement lists.
 * Exceeding this limit may cause analysis to exceed NFR2 (< 2s runtime).
 */
const MAX_JOB_REQUIREMENTS_COUNT = 500;

/**
 * Warning threshold for job requirements array size (200 requirements).
 * 
 * Arrays larger than this will trigger a console warning but processing continues.
 */
const JOB_REQUIREMENTS_WARNING_THRESHOLD = 200;

/**
 * Parses job posting text to extract structured requirements.
 * 
 * Uses simple heuristics to detect sections (e.g., "Anforderungen", "Must-have", "Nice-to-have")
 * and extracts requirements from bullet-like lines. If no sections are found, uses fallback
 * keyword extraction via n-grams and top lines.
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Input Validation:**
 * - Maximum input length: 100,000 characters (prevents performance issues)
 * - Empty input returns empty arrays
 * - Input is automatically truncated if exceeding max length
 * 
 * **Section Detection:**
 * - Detects German keywords: "Anforderungen", "Wir erwarten", "Voraussetzungen", etc.
 * - Detects English keywords: "Requirements", "Must-have", "Nice-to-have", etc.
 * - Case-insensitive matching with support for various formats (dashes, colons)
 * 
 * **Fallback Extraction:**
 * - If no sections detected, uses n-gram extraction (2-3 word phrases)
 * - Filters common stopwords (German and English)
 * - Extracts top 15 lines as potential requirements
 * 
 * @param jobPostingText - The full job posting text to parse (max 100k chars, truncated if longer)
 * @returns Object containing:
 *   - mustHave: Array of must-have requirements (strings)
 *   - niceToHave: Array of nice-to-have requirements (strings)
 *   - responsibilities: Array of responsibilities/descriptions (strings)
 * 
 * @example
 * ```typescript
 * const result = parseJobRequirements("Anforderungen:\n- TypeScript\n- React");
 * // Returns: { mustHave: ["TypeScript", "React"], niceToHave: [], responsibilities: [] }
 * ```
 * 
 * @example
 * ```typescript
 * // English job posting
 * const result = parseJobRequirements("Requirements:\n- Python\n- SQL\n\nNice to have:\n- AWS");
 * // Returns: { mustHave: ["Python", "SQL"], niceToHave: ["AWS"], responsibilities: [] }
 * ```
 * 
 * @example
 * ```typescript
 * // Fallback extraction (no sections)
 * const result = parseJobRequirements("We need Python and React experience.");
 * // Returns: { mustHave: ["python react", "need python", ...], niceToHave: [], responsibilities: [] }
 * ```
 */
export function parseJobRequirements(
  jobPostingText: string
): { mustHave: string[]; niceToHave: string[]; responsibilities: string[] } {
  // Handle empty input
  if (!jobPostingText || jobPostingText.trim().length === 0) {
    return {
      mustHave: [],
      niceToHave: [],
      responsibilities: [],
    };
  }
  
  // Input validation: Truncate if exceeds max length
  if (jobPostingText.length > MAX_INPUT_LENGTH) {
    console.warn(
      `parseJobRequirements: Input truncated from ${jobPostingText.length} to ${MAX_INPUT_LENGTH} characters`
    );
    jobPostingText = jobPostingText.slice(0, MAX_INPUT_LENGTH);
  }
  
  const lines = jobPostingText.split('\n');
  const result: {
    mustHave: string[];
    niceToHave: string[];
    responsibilities: string[];
  } = {
    mustHave: [],
    niceToHave: [],
    responsibilities: [],
  };
  
  let currentSection: SectionType = 'unknown';
  let sectionStartIndex = -1;
  let foundAnySection = false;
  
  // Iterate through lines to detect section boundaries
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionType = detectSectionType(line);
    
    // If we detect a new section header
    if (sectionType !== 'unknown') {
      // Process previous section if it existed
      if (currentSection !== 'unknown' && sectionStartIndex >= 0) {
        const sectionText = lines.slice(sectionStartIndex, i).join('\n');
        const requirements = parseBulletPoints(sectionText);
        
        if (currentSection === 'mustHave') {
          result.mustHave.push(...requirements);
        } else if (currentSection === 'niceToHave') {
          result.niceToHave.push(...requirements);
        } else if (currentSection === 'responsibilities') {
          result.responsibilities.push(...requirements);
        }
      }
      
      // Start new section
      currentSection = sectionType;
      sectionStartIndex = i + 1; // Start after the header line
      foundAnySection = true;
    }
  }
  
  // Process the last section if it exists
  if (currentSection !== 'unknown' && sectionStartIndex >= 0) {
    const sectionText = lines.slice(sectionStartIndex).join('\n');
    const requirements = parseBulletPoints(sectionText);
    
    if (currentSection === 'mustHave') {
      result.mustHave.push(...requirements);
    } else if (currentSection === 'niceToHave') {
      result.niceToHave.push(...requirements);
    } else if (currentSection === 'responsibilities') {
      result.responsibilities.push(...requirements);
    }
  }
  
  // If no sections found, use fallback keyword extraction
  if (!foundAnySection) {
    const fallbackRequirements = extractFallbackRequirements(jobPostingText);
    result.mustHave.push(...fallbackRequirements);
  }
  
  // Ensure all arrays are non-null (they already are, but ensure they're not undefined)
  return {
    mustHave: result.mustHave || [],
    niceToHave: result.niceToHave || [],
    responsibilities: result.responsibilities || [],
  };
}

/**
 * Simple stemming function for common word endings.
 * 
 * This is a basic heuristic-based stemmer that handles common English and German
 * word endings. It's not a full Porter stemmer, but sufficient for tokenization
 * and matching purposes.
 * 
 * @param word - Word to stem
 * @returns Stemmed word
 */
function simpleStem(word: string): string {
  // Only stem words longer than 4 characters to avoid over-stemming
  if (word.length <= 4) {
    return word;
  }
  
  // Common English endings (ordered by specificity - longer endings first)
  const englishEndings = [
    ['ing', ''],
    ['tion', ''],
    ['sion', ''],
    ['ness', ''],
    ['ment', ''],
    ['able', ''],
    ['ible', ''],
    ['est', ''],
    ['ful', ''],
    ['less', ''],
    ['ly', ''],
    ['ed', ''],
    // 'er' is problematic - only remove if word is long enough and not a common word
    // Skip 'er' for now to avoid over-stemming (e.g., "developer" → "develop")
    ['s', ''], // Remove plural 's' but keep if word is too short
  ];
  
  // Common German endings (ordered by specificity)
  const germanEndings = [
    ['ung', ''],
    ['en', ''],
    // Skip 'er' for German too - too aggressive
    ['es', ''],
    ['e', ''],
    ['n', ''],
  ];
  
  // Try English endings first
  for (const [ending, replacement] of englishEndings) {
    if (word.endsWith(ending) && word.length > ending.length + 2) {
      return word.slice(0, -ending.length) + replacement;
    }
  }
  
  // Try German endings
  for (const [ending, replacement] of germanEndings) {
    if (word.endsWith(ending) && word.length > ending.length + 2) {
      return word.slice(0, -ending.length) + replacement;
    }
  }
  
  return word;
}

/**
 * Tokenizes text into normalized tokens.
 * 
 * Processes text by:
 * 1. Converting to lowercase
 * 2. Removing punctuation
 * 3. Splitting into words
 * 4. Filtering stopwords and short words
 * 5. Applying simple stemming
 * 
 * @param text - Text to tokenize
 * @returns Array of normalized tokens
 */
function tokenizeText(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  // Normalize: lowercase, remove punctuation, split into words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word)); // Filter short words and stopwords
  
  // Apply simple stemming and return unique tokens
  const tokens = words.map(simpleStem);
  return Array.from(new Set(tokens)); // Deduplicate
}

/**
 * Leadership and seniority keywords (German and English).
 * 
 * These terms indicate leadership roles, seniority levels, or management experience.
 */
const SENIORITY_KEYWORDS = new Set([
  // English leadership terms
  'lead', 'leader', 'leading', 'leadership', 'manage', 'manager', 'management',
  'direct', 'director', 'directing', 'head', 'chief', 'senior', 'principal',
  'architect', 'architecting', 'strategic', 'strategy', 'strategist',
  'executive', 'exec', 'vp', 'vice president', 'c-level', 'cto', 'cfo', 'ceo',
  'team lead', 'tech lead', 'engineering lead', 'product lead',
  'mentor', 'mentoring', 'coach', 'coaching', 'supervise', 'supervisor',
  'oversee', 'overseeing', 'responsible', 'responsibility', 'accountable',
  'decision', 'decisions', 'decision-making', 'stakeholder', 'stakeholders',
  
  // German leadership terms
  'führen', 'führung', 'führend', 'leiten', 'leitung', 'leitend',
  'manager', 'management', 'direktor', 'direktorin', 'geschäftsführer',
  'geschäftsführerin', 'abteilungsleiter', 'abteilungsleiterin',
  'teamleiter', 'teamleiterin', 'projektleiter', 'projektleiterin',
  'mentor', 'mentoring', 'coach', 'coaching', 'verantwortlich',
  'verantwortung', 'verantwortlichkeiten', 'strategisch', 'strategie',
  'entscheidung', 'entscheidungen', 'entscheidungsfindung',
  'stakeholder', 'stakeholdern',
  
  // Years of experience indicators
  'years', 'jahr', 'jahre', 'jahren', 'experience', 'erfahrung',
  'experienced', 'erfahren', 'expert', 'expertise', 'expertin',
  'veteran', 'veteranin', 'seasoned', 'erfahren',
]);

/**
 * Escapes special regex characters in a string to make it safe for use in RegExp.
 * 
 * @param str - String to escape
 * @returns Escaped string safe for RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pre-compiled regex patterns for seniority keywords (performance optimization).
 * 
 * Instead of creating new RegExp objects in a loop, we compile them once.
 */
const SENIORITY_KEYWORD_PATTERNS = Array.from(SENIORITY_KEYWORDS).map((keyword) => ({
  keyword,
  pattern: new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i'),
}));

/**
 * Extracts seniority signals from text.
 * 
 * Detects leadership terms, management keywords, and years of experience
 * indicators from profile text (skills, experience descriptions, profile summary).
 * 
 * **Performance:** Uses pre-compiled regex patterns to avoid creating new RegExp
 * objects in the loop.
 * 
 * @param text - Text to analyze for seniority signals
 * @returns Array of detected seniority signals
 */
function extractSenioritySignals(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const signals: string[] = [];
  const normalizedText = text.toLowerCase();
  
  // Check for seniority keywords using pre-compiled patterns
  for (const { keyword, pattern } of SENIORITY_KEYWORD_PATTERNS) {
    // Use pre-compiled pattern for better performance
    if (pattern.test(normalizedText)) {
      signals.push(keyword);
    }
  }
  
  // Extract years of experience patterns (e.g., "5+ years", "10 Jahre", "3 years of")
  const yearsPattern = /\b(\d+)\+?\s*(years?|jahr|jahre|jahren)\s*(of\s*)?(experience|erfahrung)?/gi;
  const yearsMatches = text.matchAll(yearsPattern);
  for (const match of yearsMatches) {
    const years = match[1];
    signals.push(`${years} years experience`);
  }
  
  // Extract leadership role patterns (e.g., "Lead Developer", "Engineering Manager")
  const rolePatterns = [
    /\b(lead|senior|principal|chief|head|director|manager|vp|executive)\s+\w+/gi,
    /\b\w+\s+(lead|manager|director|architect|executive)\b/gi,
  ];
  
  for (const pattern of rolePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const role = match[0].trim();
      if (role.length > 3 && role.length < 50) {
        signals.push(role.toLowerCase());
      }
    }
  }
  
  return Array.from(new Set(signals)); // Deduplicate
}

/**
 * Extracts candidate signals from profile data.
 * 
 * This function tokenizes skills and experience descriptions from a profile,
 * normalizes them (lowercase, removes stopwords, applies simple stemming),
 * and extracts seniority signals (leadership terms, years of experience).
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Input Validation:**
 * - Maximum total profile text length: 40,000 characters (FR8)
 * - Empty or null profile returns empty arrays
 * - Profile data validation ensures all fields are safely accessed
 * - Warning logged if profile exceeds size limit (processing continues)
 * 
 * **Tokenization Process:**
 * - Skills text is tokenized into individual skill tokens
 * - Experience descriptions are tokenized into experience tokens
 * - Profile summary and projects text are also analyzed for tokens
 * - All tokens are normalized (lowercase, stopwords removed, stemmed)
 * - Tokens are automatically deduplicated using Sets
 * 
 * **Seniority Signal Extraction:**
 * - Detects leadership terms (lead, manager, director, etc.)
 * - Detects years of experience indicators ("5+ years", "10 Jahre")
 * - Detects leadership role patterns ("Lead Developer", "Engineering Manager")
 * - Uses pre-compiled regex patterns for performance
 * 
 * **Performance Considerations:**
 * - Uses Sets for O(1) deduplication during token collection
 * - Pre-compiles regex patterns to avoid repeated RegExp creation
 * - Processes text in single pass where possible
 * - Handles large profiles (up to 40k chars) efficiently
 * 
 * **Edge Cases:**
 * - Null/undefined profile or profile.data returns empty arrays
 * - Empty strings are handled gracefully
 * - Missing optional fields (profileSummary, projects) are skipped
 * - Very large profiles (>40k chars) are processed with warning
 * 
 * @param profile - Profile object containing skills, experiences, education, etc.
 * @returns Object containing:
 *   - skillsTokens: Array of normalized skill tokens extracted from skills text
 *   - experienceTokens: Array of normalized tokens from experience descriptions
 *   - senioritySignals: Array of detected seniority/leadership signals
 * 
 * @example
 * ```typescript
 * const profile: Profile = {
 *   id: '1',
 *   name: 'John Doe',
 *   createdAt: '2025-01-01',
 *   updatedAt: '2025-01-01',
 *   data: {
 *     skills: 'TypeScript, React, Node.js, Python',
 *     experiences: [{
 *       employer: 'Tech Corp',
 *       role: 'Senior Software Engineer',
 *       startDate: '01/2020',
 *       endDate: 'current',
 *       description: 'Led team of 5 developers. Built React applications.'
 *     }]
 *   }
 * };
 * 
 * const signals = extractCandidateSignals(profile);
 * // Returns: {
 * //   skillsTokens: ['typescript', 'react', 'node', 'python'],
 * //   experienceTokens: ['led', 'team', 'developer', 'built', 'react', 'application'],
 * //   senioritySignals: ['senior', 'lead', '5 years experience']
 * // }
 * ```
 * 
 * @example
 * ```typescript
 * // Edge case: Empty profile
 * const emptyProfile: Profile = { id: '1', name: 'Test', createdAt: '2025-01-01', updatedAt: '2025-01-01', data: { skills: '', experiences: [], education: [] } };
 * const signals = extractCandidateSignals(emptyProfile);
 * // Returns: { skillsTokens: [], experienceTokens: [], senioritySignals: [] }
 * ```
 */
/**
 * Calculates total profile text length for validation.
 * 
 * Includes: profileSummary, all experience descriptions, education notes,
 * skills text, and projects text.
 * 
 * @param profile - Profile to calculate text length for
 * @returns Total character count
 */
function calculateProfileTextLength(profile: Profile): number {
  if (!profile.data) {
    return 0;
  }
  
  let total = 0;
  
  if (profile.data.profileSummary) {
    total += profile.data.profileSummary.length;
  }
  
  if (profile.data.skills) {
    total += profile.data.skills.length;
  }
  
  if (profile.data.projects) {
    total += profile.data.projects.length;
  }
  
  if (profile.data.experiences) {
    for (const exp of profile.data.experiences) {
      if (exp.description) {
        total += exp.description.length;
      }
      if (exp.role) {
        total += exp.role.length;
      }
    }
  }
  
  if (profile.data.education) {
    for (const edu of profile.data.education) {
      if (edu.notes) {
        total += edu.notes.length;
      }
    }
  }
  
  return total;
}

export function extractCandidateSignals(
  profile: Profile
): { skillsTokens: string[]; experienceTokens: string[]; senioritySignals: string[] } {
  // Input validation: Check profile data exists
  if (!profile || !profile.data) {
    return {
      skillsTokens: [],
      experienceTokens: [],
      senioritySignals: [],
    };
  }
  
  // Input validation: Check total profile text length (FR8: 40k chars limit)
  const totalTextLength = calculateProfileTextLength(profile);
  if (totalTextLength > MAX_PROFILE_TEXT_LENGTH) {
    console.warn(
      `extractCandidateSignals: Profile text length (${totalTextLength}) exceeds limit (${MAX_PROFILE_TEXT_LENGTH}). Processing may be slow.`
    );
    // Continue processing but warn user - truncation would lose data
  }
  
  // Use Sets for efficient deduplication during collection
  const skillsTokensSet = new Set<string>();
  const experienceTokensSet = new Set<string>();
  const senioritySignalsSet = new Set<string>();
  
  // Tokenize skills text
  if (profile.data.skills) {
    const tokens = tokenizeText(profile.data.skills);
    for (const token of tokens) {
      skillsTokensSet.add(token);
    }
  }
  
  // Tokenize experience descriptions
  if (profile.data.experiences && profile.data.experiences.length > 0) {
    for (const experience of profile.data.experiences) {
      // Tokenize role
      if (experience.role) {
        const roleTokens = tokenizeText(experience.role);
        for (const token of roleTokens) {
          experienceTokensSet.add(token);
        }
      }
      
      // Tokenize description
      if (experience.description) {
        const descTokens = tokenizeText(experience.description);
        for (const token of descTokens) {
          experienceTokensSet.add(token);
        }
      }
    }
  }
  
  // Tokenize profile summary (adds to experience tokens as it describes overall experience)
  if (profile.data.profileSummary) {
    const summaryTokens = tokenizeText(profile.data.profileSummary);
    for (const token of summaryTokens) {
      experienceTokensSet.add(token);
    }
  }
  
  // Tokenize projects/responsibilities (adds to experience tokens)
  if (profile.data.projects) {
    const projectTokens = tokenizeText(profile.data.projects);
    for (const token of projectTokens) {
      experienceTokensSet.add(token);
    }
  }
  
  // Extract seniority signals from all relevant text fields
  const allTextForSeniority = [
    profile.data.skills || '',
    profile.data.profileSummary || '',
    profile.data.projects || '',
    ...(profile.data.experiences?.map((exp) => `${exp.role || ''} ${exp.description || ''}`) || []),
  ].join(' ');
  
  const signals = extractSenioritySignals(allTextForSeniority);
  for (const signal of signals) {
    senioritySignalsSet.add(signal);
  }
  
  // Convert Sets to Arrays for return (already deduplicated)
  return {
    skillsTokens: Array.from(skillsTokensSet),
    experienceTokens: Array.from(experienceTokensSet),
    senioritySignals: Array.from(senioritySignalsSet),
  };
}

/**
 * Synonym map for common technical terms (English and German).
 * 
 * This static dictionary maps common terms to their synonyms to improve
 * requirement matching accuracy. The map is bidirectional - each term
 * can be looked up to find its synonyms.
 * 
 * **Performance:** Pre-compiled Map for O(1) lookup performance.
 */
const SYNONYM_MAP = new Map<string, string[]>([
  // Data & Database
  ['etl', ['data pipeline', 'data processing', 'extract transform load', 'datenverarbeitung']],
  ['data pipeline', ['etl', 'data processing', 'extract transform load']],
  ['sql', ['database', 'relational database', 'rdbms', 'datenbank']],
  ['database', ['sql', 'rdbms', 'relational database', 'datenbank']],
  ['nosql', ['document database', 'mongodb', 'cassandra', 'key-value store']],
  ['mongodb', ['nosql', 'document database', 'mongo']],
  
  // APIs & Web Services
  ['rest', ['api', 'restful', 'web service', 'rest api']],
  ['api', ['rest', 'restful', 'web service', 'application programming interface']],
  ['graphql', ['api', 'query language', 'graph query']],
  ['soap', ['web service', 'xml api']],
  
  // Frontend Technologies
  ['react', ['reactjs', 'react.js', 'frontend framework']],
  ['vue', ['vuejs', 'vue.js', 'frontend framework']],
  ['angular', ['angularjs', 'angular.js', 'frontend framework']],
  ['typescript', ['ts', 'typed javascript']],
  ['javascript', ['js', 'ecmascript']],
  
  // Backend Technologies
  ['node.js', ['node', 'nodejs', 'server-side javascript']],
  ['node', ['node.js', 'nodejs']],
  ['python', ['py', 'python3']],
  ['java', ['jvm', 'java programming']],
  ['c#', ['csharp', 'dotnet', '.net']],
  ['.net', ['dotnet', 'c#', 'csharp']],
  
  // Cloud & DevOps
  ['aws', ['amazon web services', 'amazon cloud']],
  ['azure', ['microsoft azure', 'azure cloud']],
  ['gcp', ['google cloud platform', 'google cloud']],
  ['docker', ['container', 'containerization']],
  ['kubernetes', ['k8s', 'container orchestration']],
  ['ci/cd', ['continuous integration', 'continuous deployment', 'devops']],
  ['devops', ['ci/cd', 'continuous integration', 'infrastructure']],
  
  // Testing
  ['testing', ['test', 'qa', 'quality assurance', 'testen']],
  ['unit test', ['unit testing', 'test', 'testing']],
  ['integration test', ['integration testing', 'e2e test', 'end-to-end test']],
  
  // German synonyms
  ['datenbank', ['sql', 'database', 'relational database']],
  ['datenverarbeitung', ['etl', 'data processing', 'data pipeline']],
  ['api', ['rest', 'restful', 'webservice', 'web service']],
  ['webservice', ['api', 'rest', 'web service']],
  ['testen', ['testing', 'test', 'qa']],
]);

/**
 * Reverse synonym index for O(1) reverse lookup performance.
 * 
 * This pre-compiled map allows fast lookup of which terms have a given
 * synonym, avoiding O(n) iteration over SYNONYM_MAP.
 * 
 * **Performance:** Pre-compiled at module load time for O(1) lookup.
 */
const SYNONYM_REVERSE_INDEX = ((): Map<string, Set<string>> => {
  const reverseIndex = new Map<string, Set<string>>();
  
  // Build reverse index: for each synonym value, track which keys reference it
  for (const [key, values] of SYNONYM_MAP.entries()) {
    for (const value of values) {
      const normalizedValue = value.toLowerCase();
      if (!reverseIndex.has(normalizedValue)) {
        reverseIndex.set(normalizedValue, new Set<string>());
      }
      reverseIndex.get(normalizedValue)!.add(key);
    }
  }
  
  return reverseIndex;
})();

/**
 * Candidate signals type for matching.
 */
type CandidateSignals = {
  skillsTokens: string[];
  experienceTokens: string[];
  senioritySignals: string[];
};

/**
 * Match result for a single requirement.
 */
type MatchResult = {
  status: 'met' | 'partial' | 'missing';
  similarity: number; // 0.0 to 1.0
  evidence: string;
  matchedTokens: string[];
};

/**
 * Gets all synonyms for a given term (including the term itself).
 * 
 * **Performance:** Uses pre-compiled reverse index for O(1) reverse lookup
 * instead of O(n) iteration over SYNONYM_MAP.
 * 
 * @param term - Term to find synonyms for
 * @returns Array of synonyms including the original term
 */
function getSynonyms(term: string): string[] {
  const normalized = term.toLowerCase().trim();
  const synonyms = new Set<string>([normalized]); // Include original term
  
  // Direct lookup: O(1)
  const directSynonyms = SYNONYM_MAP.get(normalized);
  if (directSynonyms) {
    for (const synonym of directSynonyms) {
      synonyms.add(synonym.toLowerCase());
    }
  }
  
  // Reverse lookup: O(1) using pre-compiled reverse index
  const reverseKeys = SYNONYM_REVERSE_INDEX.get(normalized);
  if (reverseKeys) {
    for (const key of reverseKeys) {
      synonyms.add(key);
      // Also add all synonyms of the reverse key
      const keySynonyms = SYNONYM_MAP.get(key);
      if (keySynonyms) {
        for (const value of keySynonyms) {
          synonyms.add(value.toLowerCase());
        }
      }
    }
  }
  
  return Array.from(synonyms);
}

/**
 * Calculates token overlap similarity score between requirement and candidate signals.
 * 
 * Similarity = (matching tokens / total requirement tokens)
 * 
 * @param requirementTokens - Normalized tokens from requirement text
 * @param candidateTokensSet - Set of all candidate tokens (for O(1) lookup)
 * @returns Similarity score from 0.0 to 1.0
 */
function calculateTokenOverlap(
  requirementTokens: string[],
  candidateTokensSet: Set<string>
): number {
  if (requirementTokens.length === 0) {
    return 0;
  }
  
  let matchingTokens = 0;
  for (const token of requirementTokens) {
    if (candidateTokensSet.has(token)) {
      matchingTokens++;
    }
  }
  
  return matchingTokens / requirementTokens.length;
}

/**
 * Checks for exact match between requirement and candidate signals.
 * 
 * An exact match occurs when:
 * 1. The normalized requirement exactly matches a candidate token, OR
 * 2. All requirement tokens are present in candidate tokens
 * 
 * @param requirementTokens - Normalized tokens from requirement text
 * @param candidateTokensSet - Set of all candidate tokens
 * @returns Match result if exact match found, null otherwise
 */
function checkExactMatch(
  requirementTokens: string[],
  candidateTokensSet: Set<string>
): MatchResult | null {
  if (requirementTokens.length === 0) {
    return null;
  }
  
  // Check if requirement as single token matches
  const requirementAsToken = requirementTokens.join(' ');
  if (candidateTokensSet.has(requirementAsToken)) {
    return {
      status: 'met',
      similarity: 1.0,
      evidence: `Found in skills/experience: ${requirementAsToken}`,
      matchedTokens: [requirementAsToken],
    };
  }
  
  // Check if all requirement tokens are present
  const allTokensPresent = requirementTokens.every((token) => candidateTokensSet.has(token));
  if (allTokensPresent) {
    return {
      status: 'met',
      similarity: 1.0,
      evidence: `Found all tokens: ${requirementTokens.join(', ')}`,
      matchedTokens: requirementTokens,
    };
  }
  
  return null;
}

/**
 * Checks for synonym match between requirement and candidate signals.
 * 
 * Expands requirement tokens using synonym map and checks if any
 * expanded token matches candidate tokens.
 * 
 * @param requirementTokens - Normalized tokens from requirement text
 * @param candidateTokensSet - Set of all candidate tokens
 * @returns Match result if synonym match found, null otherwise
 */
function checkSynonymMatch(
  requirementTokens: string[],
  candidateTokensSet: Set<string>
): MatchResult | null {
  if (requirementTokens.length === 0) {
    return null;
  }
  
  const matchedTokens: string[] = [];
  const matchedSynonyms: string[] = [];
  
  // Expand each requirement token with synonyms
  // Optimization: Early exit if we already have high similarity match
  for (const token of requirementTokens) {
    const synonyms = getSynonyms(token);
    
    // Check if any synonym matches candidate tokens
    for (const synonym of synonyms) {
      if (candidateTokensSet.has(synonym)) {
        matchedTokens.push(synonym);
        if (synonym !== token) {
          matchedSynonyms.push(`${token} → ${synonym}`);
        }
        // Early exit optimization: If we have enough matches for high similarity,
        // we can stop checking more synonyms for this token
        // (This is a heuristic - we continue to find all matches for evidence)
      }
    }
  }
  
  if (matchedTokens.length > 0) {
    const similarity = matchedTokens.length / requirementTokens.length;
    const evidence = matchedSynonyms.length > 0
      ? `Found via synonym: ${matchedSynonyms.join(', ')}`
      : `Found in skills/experience: ${matchedTokens.join(', ')}`;
    
    return {
      status: similarity >= 0.7 ? 'met' : 'partial',
      similarity,
      evidence,
      matchedTokens,
    };
  }
  
  return null;
}

/**
 * Calculates relevance level based on match strength.
 * 
 * @param similarity - Similarity score (0.0 to 1.0)
 * @param isExactOrSynonym - Whether this is an exact or synonym match
 * @returns Relevance level: 'high', 'medium', or 'low'
 */
function calculateRelevance(similarity: number, isExactOrSynonym: boolean): 'high' | 'medium' | 'low' {
  if (isExactOrSynonym || similarity > 0.8) {
    return 'high';
  } else if (similarity >= 0.5) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Matches job requirements with candidate signals to determine which
 * requirements are met, partially met, or missing.
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Matching Strategy (Priority Order):**
 * 1. **Exact Match:** Check if requirement exactly matches candidate tokens
 * 2. **Synonym Match:** Expand requirement with synonyms and check for matches
 * 3. **Token Overlap:** Calculate similarity based on token overlap percentage
 * 
 * **Status Determination:**
 * - "met": Exact match, synonym match, or similarity >= 0.7
 * - "partial": Similarity between 0.3 and 0.7
 * - "missing": Similarity < 0.3 or no matches found
 * 
 * **Relevance Levels:**
 * - "high": Exact/synonym match or similarity > 0.8
 * - "medium": Similarity between 0.5 and 0.8
 * - "low": Similarity < 0.5 or missing
 * 
 * **Performance:**
 * - Uses Sets for O(1) token lookup
 * - Pre-compiled synonym map
 * - Caches normalized tokens to avoid re-tokenization
 * 
 * @param requirements - Array of requirement strings to match
 * @param candidateSignals - Candidate signals object with skillsTokens, experienceTokens, senioritySignals
 * @returns Array of SkillRequirementResult objects with requirement, status, evidence, and relevance
 * 
 * @example
 * ```typescript
 * const requirements = ['TypeScript', 'React experience', 'Node.js'];
 * const candidateSignals = {
 *   skillsTokens: ['typescript', 'react', 'javascript'],
 *   experienceTokens: ['node', 'backend', 'api'],
 *   senioritySignals: []
 * };
 * 
 * const results = matchRequirements(requirements, candidateSignals);
 * // Returns: [
 * //   { requirement: 'TypeScript', status: 'met', evidence: 'Found in skills/experience: typescript', relevance: 'high' },
 * //   { requirement: 'React experience', status: 'met', evidence: 'Found all tokens: react, experience', relevance: 'high' },
 * //   { requirement: 'Node.js', status: 'met', evidence: 'Found via synonym: node.js → node', relevance: 'high' }
 * // ]
 * ```
 */
export function matchRequirements(
  requirements: string[],
  candidateSignals: CandidateSignals
): SkillRequirementResult[] {
  // Input validation
  if (!requirements || requirements.length === 0) {
    return [];
  }
  
  // Input validation: Check requirements array size
  if (requirements.length > MAX_REQUIREMENTS_COUNT) {
    console.warn(
      `matchRequirements: Requirements array size (${requirements.length}) exceeds limit (${MAX_REQUIREMENTS_COUNT}). Processing may be slow.`
    );
    // Truncate to limit to prevent performance issues
    requirements = requirements.slice(0, MAX_REQUIREMENTS_COUNT);
  } else if (requirements.length > REQUIREMENTS_WARNING_THRESHOLD) {
    console.warn(
      `matchRequirements: Large requirements array (${requirements.length} requirements). Processing may take longer than usual.`
    );
  }
  
  if (!candidateSignals) {
    return requirements.map((req) => ({
      requirement: req,
      status: 'missing',
      evidence: 'No candidate signals provided',
      relevance: 'low',
    }));
  }
  
  // Combine all candidate tokens into a single Set for O(1) lookup
  const allCandidateTokens = new Set<string>([
    ...(candidateSignals.skillsTokens || []),
    ...(candidateSignals.experienceTokens || []),
    ...(candidateSignals.senioritySignals || []),
  ]);
  
  const results: SkillRequirementResult[] = [];
  
  // Process each requirement
  for (const requirement of requirements) {
    if (!requirement || requirement.trim().length === 0) {
      continue;
    }
    
    // Normalize requirement (tokenize, stem, lowercase)
    const requirementTokens = tokenizeText(requirement);
    
    if (requirementTokens.length === 0) {
      results.push({
        requirement,
        status: 'missing',
        evidence: 'Requirement contains no valid tokens after normalization',
        relevance: 'low',
      });
      continue;
    }
    
    // Try exact match first (Priority 1)
    let matchResult = checkExactMatch(requirementTokens, allCandidateTokens);
    let isExactOrSynonym = false;
    
    // Try synonym match if no exact match (Priority 2)
    if (!matchResult) {
      matchResult = checkSynonymMatch(requirementTokens, allCandidateTokens);
      isExactOrSynonym = matchResult !== null;
    } else {
      isExactOrSynonym = true;
    }
    
    // Calculate token overlap similarity if no exact/synonym match (Priority 3)
    if (!matchResult) {
      const similarity = calculateTokenOverlap(requirementTokens, allCandidateTokens);
      
      // Determine status based on similarity
      let status: 'met' | 'partial' | 'missing';
      if (similarity >= 0.7) {
        status = 'met';
      } else if (similarity >= 0.3) {
        status = 'partial';
      } else {
        status = 'missing';
      }
      
      matchResult = {
        status,
        similarity,
        evidence: similarity > 0
          ? `Partial match: ${Math.round(similarity * 100)}% token overlap`
          : 'No matching tokens found',
        matchedTokens: [],
      };
    }
    
    // Calculate relevance
    const relevance = calculateRelevance(matchResult.similarity, isExactOrSynonym);
    
    // Create result object
    results.push({
      requirement,
      status: matchResult.status,
      evidence: matchResult.evidence,
      relevance,
    });
  }
  
  return results;
}

/**
 * Common action verbs used in professional experience descriptions.
 * 
 * These verbs are commonly used in resumes and are recognized by ATS systems
 * as indicators of professional accomplishments and responsibilities.
 */
const ACTION_VERBS = new Set([
  'developed', 'implemented', 'led', 'managed', 'created', 'built', 'designed',
  'architected', 'optimized', 'improved', 'increased', 'reduced', 'delivered',
  'achieved', 'established', 'launched', 'maintained', 'supported', 'collaborated',
  'coordinated', 'executed', 'performed', 'analyzed', 'evaluated', 'resolved',
  'enhanced', 'streamlined', 'transformed', 'initiated', 'spearheaded', 'orchestrated',
  'facilitated', 'supervised', 'mentored', 'trained', 'guided', 'influenced',
  'negotiated', 'presented', 'communicated', 'documented', 'tested', 'debugged',
  'deployed', 'monitored', 'troubleshot', 'upgraded', 'migrated', 'integrated',
]);

/**
 * Pre-compiled regex patterns for action verbs (performance optimization).
 * 
 * Instead of creating new RegExp objects in a loop, we compile them once.
 */
const ACTION_VERB_PATTERNS = Array.from(ACTION_VERBS).map((verb) => ({
  verb,
  pattern: new RegExp(`\\b${escapeRegex(verb)}\\w*\\b`, 'gi'),
}));

/**
 * Outcome indicator words that suggest quantifiable results.
 */
const OUTCOME_INDICATORS = new Set([
  'improved', 'increased', 'reduced', 'optimized', 'enhanced', 'decreased',
  'boosted', 'accelerated', 'expanded', 'scaled', 'grew', 'achieved',
]);

/**
 * Pre-compiled regex pattern for outcome indicators (performance optimization).
 */
const OUTCOME_INDICATORS_PATTERN = new RegExp(
  `\\b(${Array.from(OUTCOME_INDICATORS).map((ind) => escapeRegex(ind)).join('|')})\\b`,
  'gi'
);

/**
 * Common technical terms for heuristic Coverage score calculation.
 * Used when must-have requirements are not provided.
 */
const COMMON_TECH_TERMS = new Set([
  'typescript', 'javascript', 'react', 'node', 'python', 'java', 'sql',
  'database', 'api', 'rest', 'aws', 'docker', 'kubernetes', 'git',
  'testing', 'agile', 'scrum', 'ci/cd', 'devops', 'frontend', 'backend',
]);

/**
 * Calculates Structure score (0-100) based on required fields and formatting.
 * 
 * Structure score evaluates:
 * - Required fields presence (40 points): employer, role, startDate, endDate
 * - Bullet-like formatting (60 points): lines starting with "-", "•", "*", or numbered lists
 * 
 * @param profile - Profile object containing experiences
 * @returns Structure score from 0 to 100
 */
function calculateStructureScore(profile: Profile): number {
  if (!profile.data || !profile.data.experiences || profile.data.experiences.length === 0) {
    return 0;
  }

  const experiences = profile.data.experiences;
  let requiredFieldsScore = 0;
  let formattingScore = 0;

  // Check required fields (employer, role, startDate, endDate)
  let totalFields = 0;
  let presentFields = 0;

  for (const exp of experiences) {
    totalFields += 4; // 4 required fields per experience
    if (exp.employer && exp.employer.trim().length > 0) presentFields++;
    if (exp.role && exp.role.trim().length > 0) presentFields++;
    if (exp.startDate && exp.startDate.trim().length > 0) presentFields++;
    if (exp.endDate && exp.endDate.trim().length > 0) presentFields++;
  }

  requiredFieldsScore = totalFields > 0 ? (presentFields / totalFields) * 40 : 0;

  // Check bullet-like formatting in experience descriptions
  let formattedEntries = 0;
  const bulletPattern = /^[\s]*[-•*]\s|^[\s]*\d+[\.)]\s/m; // Matches "-", "•", "*", or numbered lists

  for (const exp of experiences) {
    if (exp.description && bulletPattern.test(exp.description)) {
      formattedEntries++;
    }
  }

  formattingScore = experiences.length > 0 ? (formattedEntries / experiences.length) * 60 : 0;

  return Math.round(requiredFieldsScore + formattingScore);
}

/**
 * Calculates Coverage score (0-100) based on presence of key terms.
 * 
 * If must-have requirements are provided, calculates % of terms present.
 * Otherwise, uses heuristic based on common tech terms.
 * 
 * @param profile - Profile object containing skills and experiences
 * @param mustHaveRequirements - Optional array of must-have requirement strings
 * @returns Coverage score from 0 to 100
 */
function calculateCoverageScore(profile: Profile, mustHaveRequirements?: string[]): number {
  if (!profile.data) {
    return 0;
  }

  // Extract all text from profile
  const allText = [
    profile.data.skills || '',
    profile.data.profileSummary || '',
    profile.data.projects || '',
    ...(profile.data.experiences?.map((exp) => `${exp.role || ''} ${exp.description || ''}`) || []),
  ].join(' ').toLowerCase();

  if (allText.trim().length === 0) {
    return 0;
  }

  // Option A: Use must-have requirements if provided
  if (mustHaveRequirements && mustHaveRequirements.length > 0) {
    const requirementTokens = new Set<string>();
    for (const req of mustHaveRequirements) {
      tokenizeText(req).forEach((token) => requirementTokens.add(token));
    }

    if (requirementTokens.size === 0) {
      return 0;
    }

    const allProfileTokens = new Set<string>();
    tokenizeText(allText).forEach((token) => allProfileTokens.add(token));

    let matchedTokens = 0;
    for (const token of requirementTokens) {
      if (allProfileTokens.has(token)) {
        matchedTokens++;
      }
    }

    return Math.round((matchedTokens / requirementTokens.size) * 100);
  }

  // Option B: Heuristic based on common tech terms
  const profileTokens = new Set(tokenizeText(allText));
  let matchedTerms = 0;

  for (const term of COMMON_TECH_TERMS) {
    if (profileTokens.has(term)) {
      matchedTerms++;
    }
  }

  // Score based on how many common terms are present (expect at least 3-5 for good coverage)
  const expectedTerms = 5;
  return Math.min(100, Math.round((matchedTerms / expectedTerms) * 100));
}

/**
 * Calculates Placement score (0-100) based on whether key terms appear in experience descriptions.
 * 
 * Higher score if terms appear in experience descriptions (not only in skillsText).
 * Bonus if terms appear in multiple experience entries.
 * 
 * @param profile - Profile object containing skills and experiences
 * @param mustHaveRequirements - Optional array of must-have requirement strings
 * @returns Placement score from 0 to 100
 */
function calculatePlacementScore(profile: Profile, mustHaveRequirements?: string[]): number {
  if (!profile.data || !profile.data.experiences || profile.data.experiences.length === 0) {
    return 0;
  }

  // Extract terms to look for
  let termsToFind: Set<string>;
  if (mustHaveRequirements && mustHaveRequirements.length > 0) {
    termsToFind = new Set<string>();
    for (const req of mustHaveRequirements) {
      tokenizeText(req).forEach((token) => termsToFind.add(token));
    }
  } else {
    // Use common tech terms as fallback
    termsToFind = COMMON_TECH_TERMS;
  }

  if (termsToFind.size === 0) {
    return 0;
  }

  // Extract skills tokens
  const skillsTokens = new Set(tokenizeText(profile.data.skills || ''));

  // Extract experience tokens from all experience descriptions
  const experienceTokens = new Set<string>();
  const experienceEntriesWithTerms: number[] = [];

  for (let i = 0; i < profile.data.experiences.length; i++) {
    const exp = profile.data.experiences[i];
    const expText = `${exp.role || ''} ${exp.description || ''}`;
    const expTokens = new Set(tokenizeText(expText));

    // Check if this experience entry contains any of the terms
    let hasTerm = false;
    for (const term of termsToFind) {
      if (expTokens.has(term)) {
        experienceTokens.add(term);
        hasTerm = true;
      }
    }

    if (hasTerm) {
      experienceEntriesWithTerms.push(i);
    }
  }

  // Calculate score: terms in experience / total terms
  const termsInExperience = experienceTokens.size;
  const totalTerms = termsToFind.size;

  if (totalTerms === 0) {
    return 0;
  }

  let baseScore = (termsInExperience / totalTerms) * 100;

  // Bonus: if terms appear in multiple experience entries (up to 20% bonus)
  const entriesWithTerms = experienceEntriesWithTerms.length;
  const totalEntries = profile.data.experiences.length;
  const bonusMultiplier = totalEntries > 0 ? Math.min(1.2, 1 + (entriesWithTerms / totalEntries) * 0.2) : 1;

  return Math.min(100, Math.round(baseScore * bonusMultiplier));
}

/**
 * Calculates Context score (0-100) based on action verbs and outcomes.
 * 
 * Context score evaluates:
 * - Action verbs (50 points): presence of professional action verbs
 * - Outcomes (50 points): presence of quantifiable outcomes (numbers, percentages, improvement words)
 * 
 * @param profile - Profile object containing experiences
 * @returns Context score from 0 to 100
 */
function calculateContextScore(profile: Profile): number {
  if (!profile.data || !profile.data.experiences || profile.data.experiences.length === 0) {
    return 0;
  }

  const experiences = profile.data.experiences;
  let totalActionVerbs = 0;
  let totalOutcomes = 0;
  let totalEntries = 0;

  // Patterns for outcome detection (no global flag needed for test())
  const numberPattern = /\d+/; // Matches any number (no 'g' flag for test())
  const percentagePattern = /\d+%/; // Matches percentages (no 'g' flag for test())

  for (const exp of experiences) {
    if (!exp.description || exp.description.trim().length === 0) {
      continue;
    }

    totalEntries++;
    const descLower = exp.description.toLowerCase();

    // Count action verbs using pre-compiled patterns
    for (const { verb, pattern } of ACTION_VERB_PATTERNS) {
      // Reset lastIndex to avoid state issues (defensive programming)
      pattern.lastIndex = 0;
      if (pattern.test(descLower)) {
        totalActionVerbs++;
        break; // Count each entry only once for action verbs
      }
    }

    // Count outcomes (numbers, percentages, improvement words)
    const hasNumber = numberPattern.test(exp.description);
    const hasPercentage = percentagePattern.test(exp.description);
    
    // Use pre-compiled outcome pattern
    OUTCOME_INDICATORS_PATTERN.lastIndex = 0; // Reset lastIndex (defensive programming)
    const hasImprovement = OUTCOME_INDICATORS_PATTERN.test(descLower);

    if (hasNumber || hasPercentage || hasImprovement) {
      totalOutcomes++;
    }
  }

  if (totalEntries === 0) {
    return 0;
  }

  // Calculate scores: action verbs (50 points), outcomes (50 points)
  const actionVerbScore = (totalActionVerbs / totalEntries) * 50;
  const outcomeScore = (totalOutcomes / totalEntries) * 50;

  return Math.round(actionVerbScore + outcomeScore);
}

/**
 * Calculates overall ATS score (0-100) from breakdown scores.
 * 
 * Uses weighted average:
 * - Structure: 25%
 * - Coverage: 30%
 * - Placement: 25%
 * - Context: 20%
 * 
 * @param breakdown - Breakdown scores object
 * @returns Overall ATS score from 0 to 100
 */
function calculateOverallAtsScore(breakdown: ATSScoreBreakdown): number {
  const weightedScore =
    breakdown.structure * 0.25 +
    breakdown.coverage * 0.30 +
    breakdown.placement * 0.25 +
    breakdown.context * 0.20;

  return Math.round(weightedScore);
}

/**
 * Generates actionable ATS optimization todos based on breakdown scores.
 * 
 * Todos are prioritized by score gaps (lowest scores first).
 * 
 * @param breakdown - Breakdown scores object
 * @returns Array of actionable todo strings
 */
function generateAtsTodos(breakdown: ATSScoreBreakdown): string[] {
  const todos: string[] = [];

  // Create score gaps array for prioritization
  const scoreGaps = [
    { category: 'structure', score: breakdown.structure },
    { category: 'coverage', score: breakdown.coverage },
    { category: 'placement', score: breakdown.placement },
    { category: 'context', score: breakdown.context },
  ].sort((a, b) => a.score - b.score); // Sort by lowest score first

  // Generate todos based on score gaps
  for (const gap of scoreGaps) {
    if (gap.score < 70) {
      // Only generate todos for scores below 70
      switch (gap.category) {
        case 'structure':
          if (gap.score < 40) {
            todos.push('Add missing employer, role, and date fields to all experience entries');
          }
          if (gap.score < 60) {
            todos.push('Use bullet points (• or -) in experience descriptions for better ATS parsing');
          }
          break;
        case 'coverage':
          todos.push('Include more relevant keywords in skills/experience sections');
          break;
        case 'placement':
          todos.push('Move key terms from skills section to experience descriptions for better ATS parsing');
          break;
        case 'context':
          if (gap.score < 50) {
            todos.push("Add action verbs (e.g., 'developed', 'led', 'implemented') to experience descriptions");
          }
          todos.push('Include quantifiable outcomes (numbers, percentages) in experience descriptions');
          break;
      }
    }
  }

  // If all scores are high, provide general optimization tip
  if (todos.length === 0) {
    todos.push('Profile is well-optimized for ATS. Continue maintaining current format and content quality.');
  }

  return todos;
}

/**
 * Calculates ATS (Applicant Tracking System) score with breakdown and optimization suggestions.
 * 
 * This function evaluates how well a profile is optimized for ATS systems by analyzing:
 * - **Structure:** Required fields presence and formatting (bullet points)
 * - **Coverage:** Presence of relevant keywords/terms
 * - **Placement:** Whether key terms appear in experience descriptions (not only skills)
 * - **Context:** Action verbs and quantifiable outcomes in descriptions
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Score Calculation:**
 * - Structure (0-100): 40% required fields, 60% formatting
 * - Coverage (0-100): % of must-have terms present (or heuristic if not provided)
 * - Placement (0-100): % of terms in experience descriptions
 * - Context (0-100): 50% action verbs, 50% outcomes
 * - Overall (0-100): Weighted average (Structure 25%, Coverage 30%, Placement 25%, Context 20%)
 * 
 * **Performance:**
 * - Uses Sets for O(1) token lookup
 * - Pre-compiled action verb and outcome indicator sets
 * - Efficient pattern matching with regex
 * 
 * @param profile - Profile object to analyze
 * @param mustHaveRequirements - Optional array of must-have requirement strings for accurate Coverage score
 * @returns ATSAnalysis object with overall score, breakdown, and actionable todos
 * 
 * @example
 * ```typescript
 * const profile: Profile = {
 *   id: '1',
 *   name: 'John Doe',
 *   createdAt: '2025-01-01',
 *   updatedAt: '2025-01-01',
 *   data: {
 *     skills: 'TypeScript, React, Node.js',
 *     experiences: [{
 *       employer: 'Tech Corp',
 *       role: 'Senior Developer',
 *       startDate: '01/2020',
 *       endDate: 'current',
 *       description: '- Developed React applications\n- Led team of 5 developers\n- Increased performance by 30%'
 *     }],
 *     education: []
 *   }
 * };
 * 
 * const atsAnalysis = computeAtsScore(profile, ['TypeScript', 'React']);
 * // Returns: {
 * //   score: 85,
 * //   breakdown: { structure: 90, coverage: 100, placement: 80, context: 75 },
 * //   todos: ['Include quantifiable outcomes...']
 * // }
 * ```
 */
export function computeAtsScore(
  profile: Profile,
  mustHaveRequirements?: string[]
): ATSAnalysis {
  // Input validation
  if (!profile || !profile.data) {
    return {
      score: 0,
      breakdown: { structure: 0, coverage: 0, placement: 0, context: 0 },
      todos: ['Profile data is missing. Please add profile information.'],
    };
  }

  // Input validation: Check must-have requirements array size
  let validatedMustHaveRequirements = mustHaveRequirements;
  if (mustHaveRequirements && mustHaveRequirements.length > 0) {
    if (mustHaveRequirements.length > MAX_MUST_HAVE_REQUIREMENTS_COUNT) {
      console.warn(
        `computeAtsScore: Must-have requirements array size (${mustHaveRequirements.length}) exceeds limit (${MAX_MUST_HAVE_REQUIREMENTS_COUNT}). Processing may be slow.`
      );
      // Truncate to limit to prevent performance issues
      validatedMustHaveRequirements = mustHaveRequirements.slice(0, MAX_MUST_HAVE_REQUIREMENTS_COUNT);
    } else if (mustHaveRequirements.length > MUST_HAVE_REQUIREMENTS_WARNING_THRESHOLD) {
      console.warn(
        `computeAtsScore: Large must-have requirements array (${mustHaveRequirements.length} requirements). Processing may take longer than usual.`
      );
    }
  }

  // Calculate breakdown scores
  const structure = calculateStructureScore(profile);
  const coverage = calculateCoverageScore(profile, validatedMustHaveRequirements);
  const placement = calculatePlacementScore(profile, validatedMustHaveRequirements);
  const context = calculateContextScore(profile);

  const breakdown: ATSScoreBreakdown = {
    structure,
    coverage,
    placement,
    context,
  };

  // Calculate overall score
  const score = calculateOverallAtsScore(breakdown);

  // Generate todos
  const todos = generateAtsTodos(breakdown);

  return {
    score,
    breakdown,
    todos,
  };
}

/**
 * Job requirements type for role focus risk assessment.
 */
type JobRequirements = {
  mustHave: string[];
  niceToHave: string[];
};

/**
 * Detects unrelated tokens in profile that are not mentioned in job requirements.
 * 
 * Extracts all tokens from profile (using extractCandidateSignals) and job requirements,
 * then calculates the ratio of unrelated tokens to total profile tokens.
 * 
 * **Performance:** Accepts pre-extracted candidate signals to avoid duplicate extraction.
 * 
 * @param profile - Profile to analyze (used only if candidateSignals not provided)
 * @param jobRequirements - Job requirements (must-have + nice-to-have)
 * @param candidateSignals - Optional pre-extracted candidate signals (performance optimization)
 * @returns Object with unrelated tokens count, total tokens count, and ratio (0-1)
 */
function detectUnrelatedTokens(
  profile: Profile,
  jobRequirements: JobRequirements,
  candidateSignals?: { skillsTokens: string[]; experienceTokens: string[] }
): { unrelatedCount: number; totalCount: number; ratio: number } {
  if (!profile || !profile.data) {
    return { unrelatedCount: 0, totalCount: 0, ratio: 0 };
  }

  // Extract all tokens from profile (reuse if provided)
  const signals =
    candidateSignals || extractCandidateSignals(profile);
  const allProfileTokens = new Set([
    ...signals.skillsTokens,
    ...signals.experienceTokens,
  ]);

  // Extract all tokens from job requirements
  const allJobTokens = new Set<string>();
  for (const req of jobRequirements.mustHave) {
    const tokens = tokenizeText(req);
    for (const token of tokens) {
      allJobTokens.add(token);
    }
  }
  for (const req of jobRequirements.niceToHave) {
    const tokens = tokenizeText(req);
    for (const token of tokens) {
      allJobTokens.add(token);
    }
  }

  // Calculate unrelated tokens (tokens in profile but not in job requirements)
  let unrelatedCount = 0;
  for (const token of allProfileTokens) {
    if (!allJobTokens.has(token)) {
      unrelatedCount++;
    }
  }

  const totalCount = allProfileTokens.size;
  const ratio = totalCount > 0 ? unrelatedCount / totalCount : 0;

  return { unrelatedCount, totalCount, ratio };
}

/**
 * Detects leadership/strategy terms in profile that are not mentioned in job requirements.
 * 
 * Uses existing SENIORITY_KEYWORDS to detect leadership terms in profile,
 * then checks if these terms appear in job requirements.
 * 
 * **Performance:** Uses tokenized job requirements Set for O(1) lookup instead of O(n) string includes.
 * 
 * @param profileLeadershipTerms - Set of leadership terms from profile (pre-extracted)
 * @param jobRequirements - Job requirements (must-have + nice-to-have)
 * @returns Array of leadership/strategy terms found in profile but not in job requirements
 */
function detectLeadershipMismatch(
  profileLeadershipTerms: Set<string>,
  jobRequirements: JobRequirements
): string[] {
  // Extract and tokenize all job requirements for efficient O(1) lookup
  const allJobTokens = new Set<string>();
  for (const req of jobRequirements.mustHave) {
    const tokens = tokenizeText(req);
    for (const token of tokens) {
      allJobTokens.add(token);
    }
  }
  for (const req of jobRequirements.niceToHave) {
    const tokens = tokenizeText(req);
    for (const token of tokens) {
      allJobTokens.add(token);
    }
  }

  // Also create a Set of all seniority keywords (lowercase) for O(1) lookup
  const jobSeniorityKeywords = new Set<string>();
  for (const keyword of SENIORITY_KEYWORDS) {
    const keywordLower = keyword.toLowerCase();
    // Check if keyword appears in job requirements (tokenized)
    if (allJobTokens.has(keywordLower)) {
      jobSeniorityKeywords.add(keywordLower);
    }
  }

  // Check which leadership terms appear in profile but not in job requirements
  const mismatchedTerms: string[] = [];
  for (const term of profileLeadershipTerms) {
    const termLower = term.toLowerCase();
    // Check if term appears in job requirements (O(1) lookup)
    if (!allJobTokens.has(termLower)) {
      // Also check if any synonym or related term appears (O(1) lookup)
      if (!jobSeniorityKeywords.has(termLower)) {
        // Check if any related seniority keyword appears in job
        let found = false;
        for (const keyword of SENIORITY_KEYWORDS) {
          const keywordLower = keyword.toLowerCase();
          if (jobSeniorityKeywords.has(keywordLower)) {
            found = true;
            break;
          }
        }
        if (!found) {
          mismatchedTerms.push(term);
        }
      }
    }
  }

  return mismatchedTerms;
}

/**
 * Calculates risk level based on unrelated tokens ratio and leadership mismatch.
 * 
 * Risk levels:
 * - "gering": <30% unrelated tokens AND no leadership mismatch
 * - "mittel": 30-50% unrelated tokens OR leadership mismatch
 * - "erhöht": >50% unrelated tokens OR multiple leadership mismatches
 * 
 * @param unrelatedRatio - Ratio of unrelated tokens (0-1)
 * @param leadershipMismatchCount - Number of leadership terms in profile but not in job
 * @returns Risk level: "gering", "mittel", or "erhöht"
 */
function calculateRiskLevel(
  unrelatedRatio: number,
  leadershipMismatchCount: number
): 'gering' | 'mittel' | 'erhöht' {
  // High risk: >50% unrelated tokens OR multiple leadership mismatches
  if (unrelatedRatio > 0.5 || leadershipMismatchCount >= 2) {
    return 'erhöht';
  }

  // Medium risk: 30-50% unrelated tokens OR single leadership mismatch
  if (unrelatedRatio >= 0.3 || leadershipMismatchCount >= 1) {
    return 'mittel';
  }

  // Low risk: <30% unrelated tokens AND no leadership mismatch
  return 'gering';
}

/**
 * Generates reasons for risk assessment based on detected signals.
 * 
 * @param unrelatedRatio - Ratio of unrelated tokens (0-1)
 * @param leadershipMismatchCount - Number of leadership terms in profile but not in job
 * @returns Array of reason strings
 */
function generateRiskReasons(
  unrelatedRatio: number,
  leadershipMismatchCount: number
): string[] {
  const reasons: string[] = [];

  if (unrelatedRatio > 0.3) {
    const percentage = Math.round(unrelatedRatio * 100);
    reasons.push(
      `Profil enthält viele Skills/Erfahrungen (${percentage}%), die nicht in den Job-Anforderungen erwähnt werden`
    );
  }

  if (leadershipMismatchCount > 0) {
    if (leadershipMismatchCount === 1) {
      reasons.push(
        'Leadership/Strategie-Begriffe im Profil, aber nicht in der Stellenbeschreibung'
      );
    } else {
      reasons.push(
        `Mehrere Leadership/Strategie-Begriffe (${leadershipMismatchCount}) im Profil, aber nicht in der Stellenbeschreibung`
      );
    }
  }

  if (unrelatedRatio > 0.5) {
    reasons.push('Profil umfasst mehrere Domänen außerhalb des Job-Bereichs');
  }

  // Default reason if no specific signals detected but risk is medium
  if (reasons.length === 0 && unrelatedRatio >= 0.3) {
    reasons.push('Profil zeigt einige Abweichungen von den Job-Anforderungen');
  }

  return reasons;
}

/**
 * Generates recommendations to address role focus risk.
 * 
 * **CRITICAL:** Never uses the word "überqualifiziert" (as per PRD requirement).
 * 
 * @param riskLevel - Risk level: "gering", "mittel", or "erhöht"
 * @param unrelatedRatio - Ratio of unrelated tokens (0-1)
 * @param leadershipMismatchCount - Number of leadership terms in profile but not in job
 * @returns Array of recommendation strings
 */
function generateRiskRecommendations(
  riskLevel: 'gering' | 'mittel' | 'erhöht',
  unrelatedRatio: number,
  leadershipMismatchCount: number
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'erhöht') {
    if (unrelatedRatio > 0.5) {
      recommendations.push(
        'Nicht relevante Skills im Profil-Summary de-emphasieren'
      );
      recommendations.push(
        'Nicht relevante Erfahrungen in optionalen Bereich verschieben'
      );
    }
    if (leadershipMismatchCount > 0) {
      recommendations.push(
        'Leadership/Strategie-Erfahrungen nur erwähnen, wenn sie für die Rolle relevant sind'
      );
    }
    recommendations.push('Profil auf Job-Anforderungen fokussieren');
  } else if (riskLevel === 'mittel') {
    if (unrelatedRatio >= 0.3) {
      recommendations.push(
        'Weniger relevante Skills/Erfahrungen in optionalen Bereich verschieben'
      );
    }
    if (leadershipMismatchCount > 0) {
      recommendations.push(
        'Leadership-Erfahrungen nur hervorheben, wenn sie für die Rolle relevant sind'
      );
    }
    recommendations.push('Nur relevante Erfahrungen hervorheben');
  } else {
    // gering risk - minimal recommendations
    recommendations.push(
      'Profil ist gut fokussiert, weiterhin auf Job-Anforderungen achten'
    );
  }

  return recommendations;
}

/**
 * Calculates role focus risk assessment for a profile against job requirements.
 * 
 * This function assesses whether a profile is too broad for the target role by:
 * 1. Detecting unrelated tokens (skills/experiences not mentioned in job requirements)
 * 2. Detecting leadership/strategy terms mismatch (present in profile but not in job)
 * 3. Calculating risk level: "gering", "mittel", or "erhöht"
 * 4. Generating reasons and recommendations
 * 
 * **CRITICAL:** This function never uses the word "überqualifiziert" in any output
 * (as specified in PRD requirement).
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Performance:**
 * - Uses Sets for O(1) token lookup
 * - Reuses existing extractCandidateSignals and tokenizeText functions
 * - Efficient pattern matching
 * 
 * @param profile - Profile object to analyze
 * @param jobRequirements - Job requirements with must-have and nice-to-have arrays
 * @returns RoleFocusRisk object with risk level, reasons, and recommendations
 * 
 * @example
 * ```typescript
 * const profile: Profile = {
 *   id: '1',
 *   name: 'John Doe',
 *   createdAt: '2025-01-01',
 *   updatedAt: '2025-01-01',
 *   data: {
 *     skills: 'TypeScript, React, Python, Machine Learning, Leadership',
 *     experiences: [{
 *       employer: 'Tech Corp',
 *       role: 'Senior Developer',
 *       startDate: '01/2020',
 *       endDate: 'current',
 *       description: 'Led team of 10 developers, managed strategic initiatives'
 *     }],
 *     education: []
 *   }
 * };
 * 
 * const jobRequirements = {
 *   mustHave: ['TypeScript', 'React'],
 *   niceToHave: ['Node.js']
 * };
 * 
 * const risk = computeRoleFocusRisk(profile, jobRequirements);
 * // Returns: {
 * //   risk: 'erhöht',
 * //   reasons: ['Profil enthält viele Skills/Erfahrungen (60%), die nicht in den Job-Anforderungen erwähnt werden', 'Leadership/Strategie-Begriffe im Profil, aber nicht in der Stellenbeschreibung'],
 * //   recommendations: ['Nicht relevante Skills im Profil-Summary de-emphasieren', 'Profil auf Job-Anforderungen fokussieren']
 * // }
 * ```
 */
export function computeRoleFocusRisk(
  profile: Profile,
  jobRequirements: JobRequirements
): RoleFocusRisk {
  // Input validation
  if (!profile || !profile.data) {
    return {
      risk: 'gering',
      reasons: [],
      recommendations: [
        'Profil-Daten fehlen. Bitte Profil-Informationen hinzufügen.',
      ],
    };
  }

  // Input validation: Check job requirements array sizes
  const totalRequirementsCount =
    (jobRequirements.mustHave?.length || 0) +
    (jobRequirements.niceToHave?.length || 0);

  if (totalRequirementsCount === 0) {
    return {
      risk: 'gering',
      reasons: [],
      recommendations: [
        'Keine Job-Anforderungen vorhanden. Risiko-Bewertung nicht möglich.',
      ],
    };
  }

  if (totalRequirementsCount > MAX_JOB_REQUIREMENTS_COUNT) {
    console.warn(
      `computeRoleFocusRisk: Job requirements array size (${totalRequirementsCount}) exceeds limit (${MAX_JOB_REQUIREMENTS_COUNT}). Processing may be slow.`
    );
    // Truncate to limit to prevent performance issues
    const validatedJobRequirements: JobRequirements = {
      mustHave: (jobRequirements.mustHave || []).slice(
        0,
        Math.min(
          jobRequirements.mustHave?.length || 0,
          MAX_JOB_REQUIREMENTS_COUNT
        )
      ),
      niceToHave: (jobRequirements.niceToHave || []).slice(
        0,
        Math.max(
          0,
          MAX_JOB_REQUIREMENTS_COUNT -
            (jobRequirements.mustHave?.length || 0)
        )
      ),
    };
    jobRequirements = validatedJobRequirements;
  } else if (totalRequirementsCount > JOB_REQUIREMENTS_WARNING_THRESHOLD) {
    console.warn(
      `computeRoleFocusRisk: Large job requirements array (${totalRequirementsCount} requirements). Processing may take longer than usual.`
    );
  }

  // Extract candidate signals once (performance optimization)
  const candidateSignals = extractCandidateSignals(profile);
  const profileLeadershipTerms = new Set(candidateSignals.senioritySignals);

  // Detect unrelated tokens (reuse candidateSignals for performance)
  const { unrelatedCount, totalCount, ratio: unrelatedRatio } =
    detectUnrelatedTokens(profile, jobRequirements, candidateSignals);

  // Detect leadership mismatch (use pre-extracted leadership terms)
  const leadershipMismatchTerms = detectLeadershipMismatch(
    profileLeadershipTerms,
    jobRequirements
  );
  const leadershipMismatchCount = leadershipMismatchTerms.length;

  // Calculate risk level
  const riskLevel = calculateRiskLevel(
    unrelatedRatio,
    leadershipMismatchCount
  );

  // Generate reasons
  const reasons = generateRiskReasons(unrelatedRatio, leadershipMismatchCount);

  // Generate recommendations
  const recommendations = generateRiskRecommendations(
    riskLevel,
    unrelatedRatio,
    leadershipMismatchCount
  );

  return {
    risk: riskLevel,
    reasons,
    recommendations,
  };
}

/**
 * Calculates match label based on skill fit, gaps, role focus risk, and ATS score.
 * 
 * Match labels:
 * - "Gute Passung": >=70% must-have met + ATS >= 60 + low/medium gaps + role focus gering/mittel
 * - "Teilweise Passung": 30-70% must-have met OR medium gaps OR ATS 40-60 OR role focus mittel
 * - "Stretch-Rolle": <30% must-have met OR high gaps OR ATS < 40 OR role focus erhöht
 * 
 * **Performance:** Accepts pre-calculated mustHaveMetCount to avoid duplicate filtering.
 * 
 * @param mustHaveCount - Total number of must-have requirements
 * @param mustHaveMetCount - Number of must-have requirements with status "met" (pre-calculated)
 * @param gaps - Gap action cards
 * @param roleFocus - Role focus risk assessment
 * @param ats - ATS analysis score
 * @returns Match label: "Gute Passung", "Teilweise Passung", or "Stretch-Rolle"
 */
function calculateMatchLabel(
  mustHaveCount: number,
  mustHaveMetCount: number,
  gaps: GapActionCard[],
  roleFocus: RoleFocusRisk,
  ats: ATSAnalysis
): 'Gute Passung' | 'Teilweise Passung' | 'Stretch-Rolle' {
  // Calculate must-have coverage ratio
  const mustHaveMetRatio =
    mustHaveCount > 0 ? mustHaveMetCount / mustHaveCount : 0;

  // Calculate gap severity
  const missingGapsCount = gaps.filter((g) => g.status === 'missing').length;
  const highRelevanceGapsCount = gaps.filter(
    (g) => g.relevance === 'high' && g.status === 'missing'
  ).length;

  // Check for "Stretch-Rolle" conditions
  if (
    mustHaveMetRatio < 0.3 ||
    ats.score < 40 ||
    roleFocus.risk === 'erhöht' ||
    highRelevanceGapsCount >= 3
  ) {
    return 'Stretch-Rolle';
  }

  // Check for "Gute Passung" conditions
  // Note: At this point, roleFocus.risk can only be 'gering' or 'mittel' (not 'erhöht')
  if (
    mustHaveMetRatio >= 0.7 &&
    ats.score >= 60 &&
    (roleFocus.risk === 'gering' || roleFocus.risk === 'mittel') &&
    missingGapsCount <= 2
  ) {
    return 'Gute Passung';
  }

  // Default to "Teilweise Passung"
  return 'Teilweise Passung';
}

/**
 * Generates bullet points for executive summary.
 * 
 * Generates 2-3 bullet points summarizing key insights:
 * 1. Match label summary with must-have coverage
 * 2. ATS score or role focus risk (if notable)
 * 3. Key gaps or recommendations (if significant)
 * 
 * **Performance:** Accepts pre-calculated mustHaveCount and mustHaveMetCount to avoid duplicate filtering.
 * 
 * @param matchLabel - Match label: "Gute Passung", "Teilweise Passung", or "Stretch-Rolle"
 * @param mustHaveCount - Total number of must-have requirements (pre-calculated)
 * @param mustHaveMetCount - Number of must-have requirements with status "met" (pre-calculated)
 * @param gaps - Gap action cards
 * @param roleFocus - Role focus risk assessment
 * @param ats - ATS analysis score
 * @returns Array of 2-3 bullet point strings
 */
function generateExecutiveBullets(
  matchLabel: 'Gute Passung' | 'Teilweise Passung' | 'Stretch-Rolle',
  mustHaveCount: number,
  mustHaveMetCount: number,
  gaps: GapActionCard[],
  roleFocus: RoleFocusRisk,
  ats: ATSAnalysis
): string[] {
  const bullets: string[] = [];

  // First bullet: Match label summary with must-have coverage

  if (matchLabel === 'Gute Passung') {
    bullets.push(
      `${matchLabel}: ${mustHaveMetCount} von ${mustHaveCount} Must-Have-Anforderungen erfüllt`
    );
  } else if (matchLabel === 'Teilweise Passung') {
    bullets.push(
      `${matchLabel}: ${mustHaveMetCount} von ${mustHaveCount} Must-Have-Anforderungen erfüllt, einige Lücken vorhanden`
    );
  } else {
    bullets.push(
      `${matchLabel}: ${mustHaveMetCount} von ${mustHaveCount} Must-Have-Anforderungen erfüllt, mehrere wichtige Lücken`
    );
  }

  // Second bullet: ATS score or role focus risk (if notable)
  if (ats.score < 60 || roleFocus.risk === 'erhöht') {
    if (roleFocus.risk === 'erhöht') {
      bullets.push(`Role Focus Risk: ${roleFocus.risk}`);
    } else if (ats.score < 60) {
      bullets.push(`ATS-Score: ${ats.score}/100 (Optimierung empfohlen)`);
    }
  } else if (ats.score >= 80) {
    bullets.push(`ATS-Score: ${ats.score}/100 (sehr gut)`);
  }

  // Third bullet: Key gaps or recommendations (if significant)
  const highRelevanceMissingGaps = gaps
    .filter((g) => g.relevance === 'high' && g.status === 'missing')
    .slice(0, 3)
    .map((g) => g.requirement);

  if (highRelevanceMissingGaps.length > 0) {
    const gapsText =
      highRelevanceMissingGaps.length === 1
        ? highRelevanceMissingGaps[0]
        : highRelevanceMissingGaps.slice(0, 2).join(', ') +
          (highRelevanceMissingGaps.length > 2 ? ' und weitere' : '');
    bullets.push(`Wichtige Lücken: ${gapsText}`);
  } else if (roleFocus.recommendations.length > 0 && roleFocus.risk !== 'gering') {
    const topRec = roleFocus.recommendations[0];
    bullets.push(`Empfehlung: ${topRec}`);
  } else if (ats.todos.length > 0 && ats.score < 70) {
    const topTodo = ats.todos[0];
    bullets.push(`ATS-Optimierung: ${topTodo}`);
  }

  // Ensure we have at least 2 bullets (add generic if needed)
  if (bullets.length < 2) {
    if (matchLabel === 'Gute Passung') {
      bullets.push('Profil zeigt gute Übereinstimmung mit den Job-Anforderungen');
    } else if (matchLabel === 'Teilweise Passung') {
      bullets.push('Einige Anpassungen am Profil könnten die Passung verbessern');
    } else {
      bullets.push('Erhebliche Anpassungen am Profil erforderlich');
    }
  }

  // Limit to 3 bullets maximum
  return bullets.slice(0, 3);
}

/**
 * Builds executive summary with match label and bullet points.
 * 
 * This function generates a high-level assessment of profile-job fit by:
 * 1. Calculating match label based on skill fit, gaps, role focus risk, and ATS score
 * 2. Generating 2-3 bullet points summarizing key insights
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Match Label Logic:**
 * - "Gute Passung": >=70% must-have met + ATS >= 60 + low gaps + role focus gering/mittel
 * - "Teilweise Passung": 30-70% must-have met OR medium gaps OR ATS 40-60 OR role focus mittel
 * - "Stretch-Rolle": <30% must-have met OR high gaps OR ATS < 40 OR role focus erhöht
 * 
 * **Performance:**
 * - Simple calculations, no complex operations
 * - Efficient array filtering and slicing
 * 
 * @param skillFit - Skill fit results with must-have and nice-to-have requirements
 * @param gaps - Gap action cards
 * @param roleFocus - Role focus risk assessment
 * @param ats - ATS analysis score
 * @returns ExecutiveSummary object with matchLabel and bullets (2-3 items)
 * 
 * @example
 * ```typescript
 * const skillFit = {
 *   mustHave: [
 *     { requirement: 'TypeScript', status: 'met', relevance: 'high' },
 *     { requirement: 'React', status: 'met', relevance: 'high' },
 *     { requirement: 'Node.js', status: 'partial', relevance: 'medium' }
 *   ],
 *   niceToHave: []
 * };
 * 
 * const gaps: GapActionCard[] = [];
 * const roleFocus: RoleFocusRisk = { risk: 'gering', reasons: [], recommendations: [] };
 * const ats: ATSAnalysis = { score: 75, breakdown: { structure: 80, coverage: 90, placement: 70, context: 60 }, todos: [] };
 * 
 * const summary = buildExecutiveSummary(skillFit, gaps, roleFocus, ats);
 * // Returns: {
 * //   matchLabel: 'Gute Passung',
 * //   bullets: [
 * //     'Gute Passung: 2 von 3 Must-Have-Anforderungen erfüllt',
 * //     'ATS-Score: 75/100 (sehr gut)'
 * //   ]
 * // }
 * ```
 */
export function buildExecutiveSummary(
  skillFit: {
    mustHave: SkillRequirementResult[];
    niceToHave: SkillRequirementResult[];
  },
  gaps: GapActionCard[],
  roleFocus: RoleFocusRisk,
  ats: ATSAnalysis
): ExecutiveSummary {
  // Input validation
  if (!skillFit || !skillFit.mustHave) {
    return {
      matchLabel: 'Stretch-Rolle',
      bullets: [
        'Keine Skill-Fit-Daten verfügbar. Bitte Analyse erneut durchführen.',
      ],
    };
  }

  // Calculate must-have coverage once (performance optimization)
  const mustHaveCount = skillFit.mustHave.length;
  const mustHaveMetCount = skillFit.mustHave.filter(
    (r) => r.status === 'met'
  ).length;

  // Calculate match label (reuse pre-calculated values)
  const matchLabel = calculateMatchLabel(
    mustHaveCount,
    mustHaveMetCount,
    gaps,
    roleFocus,
    ats
  );

  // Generate bullet points (reuse pre-calculated values)
  const bullets = generateExecutiveBullets(
    matchLabel,
    mustHaveCount,
    mustHaveMetCount,
    gaps,
    roleFocus,
    ats
  );

  return {
    matchLabel,
    bullets,
  };
}

/**
 * Determines recommended action for a gap based on requirement status and candidate signals.
 * 
 * Recommended actions:
 * - "rephrase": Requirement is partial match, candidate has related skills (synonym match possible)
 * - "evidence": Requirement is missing but candidate likely has skill (synonym match or related terms)
 * - "learn": Requirement is missing and candidate doesn't have related skills
 * - "ignore": Requirement has low relevance (optional, can be skipped)
 * 
 * **Performance:** Returns both recommended action and synonym match flag to avoid duplicate calculation.
 * 
 * @param requirement - Requirement result with status and relevance
 * @param candidateSignals - Candidate signals (skills, experience, seniority tokens)
 * @returns Object with recommended action and hasSynonymMatch flag
 */
function determineRecommendedAction(
  requirement: SkillRequirementResult,
  candidateSignals: CandidateSignals
): { action: 'rephrase' | 'evidence' | 'learn' | 'ignore'; hasSynonymMatch: boolean } {
  // Ignore low relevance requirements
  if (requirement.relevance === 'low') {
    return { action: 'ignore', hasSynonymMatch: false };
  }

  // Create Set of all candidate tokens for efficient lookup
  const allCandidateTokens = new Set<string>([
    ...candidateSignals.skillsTokens,
    ...candidateSignals.experienceTokens,
    ...candidateSignals.senioritySignals,
  ]);

  // Tokenize requirement for matching
  const requirementTokens = tokenizeText(requirement.requirement);
  
  // Check for synonym matches (calculate once, reuse result)
  let hasSynonymMatch = false;
  for (const token of requirementTokens) {
    const synonyms = getSynonyms(token);
    for (const synonym of synonyms) {
      if (allCandidateTokens.has(synonym)) {
        hasSynonymMatch = true;
        break;
      }
    }
    if (hasSynonymMatch) break;
  }

  // Determine action based on status and matches
  if (requirement.status === 'partial') {
    // Partial match: candidate has some related skills, suggest rephrasing
    return { action: 'rephrase', hasSynonymMatch };
  }

  // Missing requirement
  if (hasSynonymMatch) {
    // Missing but synonym match found: candidate likely has skill, suggest adding evidence
    return { action: 'evidence', hasSynonymMatch };
  }

  // Missing and no synonym match: candidate doesn't have skill, suggest learning
  return { action: 'learn', hasSynonymMatch: false };
}

/**
 * Identifies skill gaps from requirements and generates actionable gap cards.
 * 
 * This function processes requirements with "partial" or "missing" status and creates
 * GapActionCard objects with recommended actions (rephrase, evidence, learn, ignore).
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Gap Identification:**
 * - Only processes requirements with status "partial" or "missing"
 * - Requirements with status "met" are not gaps
 * - Uses synonym matching to determine if candidate likely has skill
 * 
 * **Recommended Actions:**
 * - "rephrase": Partial match, candidate has related skills
 * - "evidence": Missing but synonym match found (candidate likely has skill)
 * - "learn": Missing and no synonym match (candidate doesn't have skill)
 * - "ignore": Low relevance requirement
 * 
 * **Performance:**
 * - Uses Sets for O(1) token lookup
 * - Reuses existing getSynonyms function for synonym matching
 * - Efficient filtering and mapping
 * 
 * @param requirements - Array of skill requirement results
 * @param candidateSignals - Candidate signals (skills, experience, seniority tokens)
 * @returns Array of GapActionCard objects with recommended actions
 * 
 * @example
 * ```typescript
 * const requirements: SkillRequirementResult[] = [
 *   { requirement: 'TypeScript', status: 'met', relevance: 'high' },
 *   { requirement: 'React', status: 'partial', relevance: 'high' },
 *   { requirement: 'Python', status: 'missing', relevance: 'high' }
 * ];
 * 
 * const candidateSignals = {
 *   skillsTokens: ['typescript', 'react'],
 *   experienceTokens: ['javascript', 'frontend'],
 *   senioritySignals: []
 * };
 * 
 * const gaps = identifyGaps(requirements, candidateSignals);
 * // Returns: [
 * //   { requirement: 'React', relevance: 'high', status: 'partial', recommendedAction: 'rephrase', suggestionType: 'synonym_match' },
 * //   { requirement: 'Python', relevance: 'high', status: 'missing', recommendedAction: 'learn' }
 * // ]
 * ```
 */
export function identifyGaps(
  requirements: SkillRequirementResult[],
  candidateSignals: CandidateSignals
): GapActionCard[] {
  // Input validation
  if (!requirements || requirements.length === 0) {
    return [];
  }

  if (!candidateSignals) {
    return [];
  }

  // Filter to only partial or missing requirements (gaps)
  const gaps = requirements.filter(
    (req) => req.status === 'partial' || req.status === 'missing'
  );

  // Create GapActionCard for each gap
  const gapCards: GapActionCard[] = gaps.map((requirement) => {
    // Determine recommended action (includes synonym match flag to avoid duplicate calculation)
    const { action: recommendedAction, hasSynonymMatch } = determineRecommendedAction(
      requirement,
      candidateSignals
    );

    // Determine suggestion type based on action and synonym match (reuse hasSynonymMatch from above)
    let suggestionType: string | undefined;
    if (recommendedAction === 'rephrase' || recommendedAction === 'evidence') {
      if (hasSynonymMatch) {
        suggestionType = 'synonym_match';
      } else if (recommendedAction === 'rephrase') {
        suggestionType = 'partial_match';
      }
    }

    return {
      requirement: requirement.requirement,
      relevance: requirement.relevance || 'medium',
      status: requirement.status,
      recommendedAction,
      suggestionType,
    };
  });

  // Filter out "ignore" actions (low relevance)
  return gapCards.filter((card) => card.recommendedAction !== 'ignore');
}

/**
 * Builds prioritized next steps checklist from ATS todos, gap actions, and role focus recommendations.
 * 
 * This function creates a prioritized list of actionable next steps for improving profile-job fit.
 * Priority order: role focus adjustments, ATS optimizations, gap actions, prompt export.
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Prioritization:**
 * 1. Role focus adjustments (if roleFocusRecs.length > 0)
 * 2. ATS optimizations (if atsTodos.length > 0)
 * 3. Gap actions (if gapActions.length > 0, prioritize high relevance first)
 * 4. Prompt export (always last, if applicable)
 * 
 * **Performance:**
 * - Simple array operations
 * - Efficient filtering and sorting
 * 
 * @param atsTodos - Array of ATS optimization todos
 * @param gapActions - Array of gap action cards
 * @param roleFocusRecs - Array of role focus recommendations
 * @returns Prioritized array of next steps checklist items (string[])
 * 
 * @example
 * ```typescript
 * const atsTodos = ['Add bullet points to experience descriptions'];
 * const gapActions: GapActionCard[] = [
 *   { requirement: 'Python', relevance: 'high', status: 'missing', recommendedAction: 'learn' }
 * ];
 * const roleFocusRecs = ['De-emphasize unrelated skills'];
 * 
 * const nextSteps = buildNextSteps(atsTodos, gapActions, roleFocusRecs);
 * // Returns: [
 * //   'Role Focus: De-emphasize unrelated skills',
 * //   'ATS: Add bullet points to experience descriptions',
 * //   'Gap: Python - learn'
 * // ]
 * ```
 */
export function buildNextSteps(
  atsTodos: string[],
  gapActions: GapActionCard[],
  roleFocusRecs: string[]
): string[] {
  const nextSteps: string[] = [];

  // Priority 1: Role focus adjustments
  if (roleFocusRecs && roleFocusRecs.length > 0) {
    for (const rec of roleFocusRecs) {
      nextSteps.push(`Role Focus: ${rec}`);
    }
  }

  // Priority 2: ATS optimizations
  if (atsTodos && atsTodos.length > 0) {
    for (const todo of atsTodos) {
      nextSteps.push(`ATS: ${todo}`);
    }
  }

  // Priority 3: Gap actions (prioritize high relevance first)
  if (gapActions && gapActions.length > 0) {
    // Sort gaps by relevance (high first, then medium, then low)
    const sortedGaps = [...gapActions].sort((a, b) => {
      const relevanceOrder = { high: 0, medium: 1, low: 2 };
      return (
        relevanceOrder[a.relevance] - relevanceOrder[b.relevance]
      );
    });

    for (const gap of sortedGaps) {
      const actionText =
        gap.recommendedAction === 'rephrase'
          ? 'umformulieren'
          : gap.recommendedAction === 'evidence'
            ? 'Nachweis hinzufügen'
            : gap.recommendedAction === 'learn'
              ? 'erlernen'
              : 'ignorieren';
      nextSteps.push(`Gap: ${gap.requirement} - ${actionText}`);
    }
  }

  // Priority 4: Prompt export (always last, if applicable)
  // Note: Prompt export is optional and can be added by the UI layer
  // We don't add it here as it's not part of the analysis engine

  return nextSteps;
}

/**
 * In-memory cache for analysis results.
 * 
 * Cache key: hash of profile data + job posting text
 * Cache value: AnalysisResult object
 * 
 * **Privacy-First:** Cache is in-memory only, no external storage.
 * Cache is cleared on page reload.
 * 
 * **Performance:**
 * - Uses Map for O(1) lookup
 * - No expiration (optional: can add TTL later)
 * - Optional size limit to prevent memory issues
 */
const analysisCache = new Map<string, AnalysisResult>();

/**
 * Maximum cache size (100 entries).
 * 
 * This limit prevents memory issues when many analyses are performed.
 * When limit is reached, oldest entries are removed (FIFO).
 */
const MAX_CACHE_SIZE = 100;

/**
 * Generates cache key from profile and job posting text.
 * 
 * Uses hash function to create deterministic cache key.
 * Same profile + job posting = same cache key.
 * 
 * @param profile - Profile object
 * @param jobPostingText - Job posting text
 * @returns Cache key (hash string)
 */
function getCacheKey(profile: Profile, jobPostingText: string): string {
  return createAnalysisHash(profile.data, jobPostingText);
}

/**
 * Gets cached analysis result if available.
 * 
 * @param key - Cache key (hash string)
 * @returns Cached AnalysisResult or null if not found
 */
function getCachedResult(key: string): AnalysisResult | null {
  return analysisCache.get(key) || null;
}

/**
 * Stores analysis result in cache.
 * 
 * Implements FIFO eviction when cache size exceeds MAX_CACHE_SIZE.
 * 
 * @param key - Cache key (hash string)
 * @param result - AnalysisResult to cache
 */
function setCachedResult(key: string, result: AnalysisResult): void {
  // Implement FIFO eviction if cache is full
  if (analysisCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first key in Map iteration order)
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) {
      analysisCache.delete(firstKey);
    }
  }
  
  analysisCache.set(key, result);
}

/**
 * Runs complete analysis pipeline with caching support.
 * 
 * This function orchestrates all analysis functions:
 * 1. parseJobRequirements - Extract requirements from job posting
 * 2. extractCandidateSignals - Extract signals from profile
 * 3. matchRequirements - Match requirements with candidate signals
 * 4. computeAtsScore - Calculate ATS score
 * 5. computeRoleFocusRisk - Assess role focus risk
 * 6. identifyGaps - Identify skill gaps
 * 7. buildExecutiveSummary - Generate executive summary
 * 8. buildNextSteps - Generate next steps
 * 
 * **Caching:**
 * - Checks cache before running analysis
 * - Returns cached result if available (cache hit)
 * - Runs full analysis if cache miss, then caches result
 * 
 * This function runs deterministically in the browser without external API calls.
 * Privacy-First: No data is sent to servers (FR29, FR41, FR42).
 * 
 * **Performance:**
 * - Cache hit: Returns immediately (< 1ms)
 * - Cache miss: Runs full analysis pipeline (< 2s per NFR2)
 * - Uses hash-based cache keys for O(1) lookup
 * 
 * @param profile - Profile object to analyze
 * @param jobPostingText - Job posting text
 * @returns AnalysisResult object with all analysis components
 * 
 * @example
 * ```typescript
 * const profile: Profile = {
 *   id: '1',
 *   name: 'John Doe',
 *   createdAt: '2025-01-01',
 *   updatedAt: '2025-01-01',
 *   data: {
 *     skills: 'TypeScript, React',
 *     experiences: [{
 *       employer: 'Tech Corp',
 *       role: 'Developer',
 *       startDate: '01/2020',
 *       endDate: 'current',
 *       description: 'Developed applications'
 *     }],
 *     education: []
 *   }
 * };
 * 
 * const jobPostingText = 'Looking for TypeScript developer with React experience';
 * 
 * const result = runAnalysis(profile, jobPostingText);
 * // Returns: {
 * //   summary: { matchLabel: 'Gute Passung', bullets: [...] },
 * //   skillFit: { mustHave: [...], niceToHave: [...] },
 * //   gaps: [...],
 * //   ats: { score: 75, breakdown: {...}, todos: [...] },
 * //   roleFocus: { risk: 'gering', reasons: [], recommendations: [] },
 * //   nextSteps: [...]
 * // }
 * ```
 */
export function runAnalysis(
  profile: Profile,
  jobPostingText: string
): AnalysisResult {
  // Input validation
  if (!profile || !profile.data) {
    throw new Error('Profile data is required');
  }

  if (!jobPostingText || jobPostingText.trim().length === 0) {
    throw new Error('Job posting text is required');
  }

  // Generate cache key
  const cacheKey = getCacheKey(profile, jobPostingText);

  // Check cache
  const cachedResult = getCachedResult(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Cache miss: Run full analysis pipeline

  // Step 1: Parse job requirements
  const jobRequirements = parseJobRequirements(jobPostingText);

  // Step 2: Extract candidate signals
  const candidateSignals = extractCandidateSignals(profile);

  // Step 3: Match requirements
  const mustHaveResults = matchRequirements(
    jobRequirements.mustHave,
    candidateSignals
  );
  const niceToHaveResults = matchRequirements(
    jobRequirements.niceToHave,
    candidateSignals
  );

  // Step 4: Compute ATS score
  const mustHaveRequirements = jobRequirements.mustHave;
  const ats = computeAtsScore(profile, mustHaveRequirements);

  // Step 5: Compute role focus risk
  const roleFocus = computeRoleFocusRisk(profile, {
    mustHave: jobRequirements.mustHave,
    niceToHave: jobRequirements.niceToHave,
  });

  // Step 6: Identify gaps
  const gaps = identifyGaps(mustHaveResults, candidateSignals);

  // Step 7: Build executive summary
  const summary = buildExecutiveSummary(
    {
      mustHave: mustHaveResults,
      niceToHave: niceToHaveResults,
    },
    gaps,
    roleFocus,
    ats
  );

  // Step 8: Build next steps
  const nextSteps = buildNextSteps(
    ats.todos,
    gaps,
    roleFocus.recommendations
  );

  // Assemble result
  const result: AnalysisResult = {
    summary,
    skillFit: {
      mustHave: mustHaveResults,
      niceToHave: niceToHaveResults,
    },
    gaps,
    ats,
    roleFocus,
    nextSteps,
  };

  // Cache result
  setCachedResult(cacheKey, result);

  // Track statistics (only for non-cached analyses, async - don't await to avoid blocking)
  // Privacy-First: Only tracks anonymous counters, no personal data
  trackAnalysis(result, jobPostingText).catch((error) => {
    // Log warning but don't break analysis if tracking fails
    console.warn('Failed to track statistics:', error);
  });

  return result;
}

