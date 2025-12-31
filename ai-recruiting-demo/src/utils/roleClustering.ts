/**
 * Role Clustering Utility
 * 
 * Extracts role and industry clusters from job posting text for anonymous statistics.
 * 
 * Uses simple keyword matching to categorize roles and industries.
 * Returns "Other" or "Unknown" if no match is found.
 * 
 * **Privacy-First:**
 * - Only extracts generic categories, not specific job titles
 * - No personal data is extracted
 * - Used only for anonymous aggregated statistics
 * 
 * @module utils/roleClustering
 */

/**
 * Role cluster keywords mapping
 * Maps keywords to role cluster names
 */
const ROLE_KEYWORDS: Record<string, string> = {
  // Software Engineering
  'software engineer': 'Software Engineer',
  'software developer': 'Software Engineer',
  'entwickler': 'Software Engineer',
  'programmierer': 'Software Engineer',
  'full stack': 'Software Engineer',
  'fullstack': 'Software Engineer',
  'backend': 'Software Engineer',
  'frontend': 'Software Engineer',
  'full-stack': 'Software Engineer',
  
  // Data Science
  'data scientist': 'Data Scientist',
  'data analyst': 'Data Scientist',
  'data engineer': 'Data Scientist',
  'data science': 'Data Scientist',
  'machine learning': 'Data Scientist',
  'ml engineer': 'Data Scientist',
  'ai engineer': 'Data Scientist',
  
  // Product Management
  'product manager': 'Product Manager',
  'produktmanager': 'Product Manager',
  'product owner': 'Product Manager',
  'po ': 'Product Manager',
  'scrum master': 'Product Manager',
  
  // Design
  'designer': 'Designer',
  'ux designer': 'Designer',
  'ui designer': 'Designer',
  'ux/ui': 'Designer',
  'product designer': 'Designer',
  
  // DevOps / Infrastructure
  'devops': 'DevOps Engineer',
  'sre': 'DevOps Engineer',
  'site reliability': 'DevOps Engineer',
  'cloud engineer': 'DevOps Engineer',
  'infrastructure': 'DevOps Engineer',
  
  // QA / Testing
  'qa engineer': 'QA Engineer',
  'test engineer': 'QA Engineer',
  'quality assurance': 'QA Engineer',
  'tester': 'QA Engineer',
}

/**
 * Industry cluster keywords mapping
 * Maps keywords to industry cluster names
 * 
 * IMPORTANT: Order matters! More specific keywords should come first
 * to avoid false matches (e.g., "fintech" should match "Finance" before "tech" matches "Technology")
 */
const INDUSTRY_KEYWORDS: Record<string, string> = {
  // Finance (check before Technology to catch "fintech")
  'fintech': 'Finance',
  'finance': 'Finance',
  'banking': 'Finance',
  'financial': 'Finance',
  
  // Healthcare
  'healthcare': 'Healthcare',
  'health': 'Healthcare',
  'medical': 'Healthcare',
  'pharma': 'Healthcare',
  
  // E-commerce
  'e-commerce': 'E-commerce',
  'ecommerce': 'E-commerce',
  'retail': 'E-commerce',
  'online shop': 'E-commerce',
  
  // Technology (check last to avoid false matches)
  'software': 'Technology',
  'information technology': 'Technology',
  'it ': 'Technology',
  'saas': 'Technology',
  'tech': 'Technology',
}

/**
 * Extracts role cluster from job posting text.
 * 
 * Uses simple keyword matching to categorize the role.
 * Returns "Other" if no match is found.
 * 
 * @param jobPostingText - Job posting text (first few lines analyzed)
 * @returns Role cluster name (e.g., "Software Engineer", "Data Scientist", "Other")
 */
export function extractRoleCluster(jobPostingText: string): string {
  if (!jobPostingText || jobPostingText.trim().length === 0) {
    return 'Other'
  }

  // Analyze first 500 characters (usually contains role title)
  const textToAnalyze = jobPostingText
    .substring(0, 500)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace

  // Check for role keywords (case-insensitive)
  for (const [keyword, cluster] of Object.entries(ROLE_KEYWORDS)) {
    if (textToAnalyze.includes(keyword.toLowerCase())) {
      return cluster
    }
  }

  return 'Other'
}

/**
 * Extracts industry cluster from job posting text.
 * 
 * Uses simple keyword matching to categorize the industry.
 * Returns "Unknown" if no match is found (industry is optional).
 * 
 * @param jobPostingText - Job posting text (full text analyzed)
 * @returns Industry cluster name (e.g., "Technology", "Finance", "Unknown")
 */
export function extractIndustryCluster(jobPostingText: string): string {
  if (!jobPostingText || jobPostingText.trim().length === 0) {
    return 'Unknown'
  }

  const textToAnalyze = jobPostingText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace

  // Check for industry keywords (case-insensitive)
  for (const [keyword, cluster] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (textToAnalyze.includes(keyword.toLowerCase())) {
      return cluster
    }
  }

  return 'Unknown'
}

/**
 * Maps ATS score to bucket name.
 * 
 * @param atsScore - ATS score (0-100)
 * @returns Bucket name: "very_low", "low", "medium", "high", "very_high"
 */
export function getAtsScoreBucket(atsScore: number): string {
  if (atsScore >= 0 && atsScore <= 20) {
    return 'very_low'
  } else if (atsScore >= 21 && atsScore <= 40) {
    return 'low'
  } else if (atsScore >= 41 && atsScore <= 60) {
    return 'medium'
  } else if (atsScore >= 61 && atsScore <= 80) {
    return 'high'
  } else if (atsScore >= 81 && atsScore <= 100) {
    return 'very_high'
  }
  
  // Fallback for invalid scores
  return 'unknown'
}

