/**
 * Hash utility functions for creating deterministic hashes from input strings.
 * 
 * This module provides hash functions for creating cache keys and other deterministic
 * identifiers. All functions are pure and deterministic (same input = same output).
 * 
 * Privacy-First: All hashing is done locally in the browser without external API calls.
 */

/**
 * Simple string hash function (djb2 algorithm variant).
 * 
 * This is a fast, deterministic hash function suitable for creating cache keys.
 * It's not cryptographically secure, but sufficient for in-memory caching.
 * 
 * **Performance:**
 * - O(n) where n is input length
 * - Fast for typical input sizes (< 100k chars)
 * 
 * **Determinism:**
 * - Same input always produces same hash
 * - Different inputs produce different hashes (with high probability)
 * 
 * @param input - String to hash
 * @returns Hash string (hexadecimal representation)
 * 
 * @example
 * ```typescript
 * const hash1 = createHash('test');
 * const hash2 = createHash('test');
 * // hash1 === hash2 (deterministic)
 * 
 * const hash3 = createHash('different');
 * // hash3 !== hash1 (different input = different hash)
 * ```
 */
export function createHash(input: string): string {
  if (!input || input.length === 0) {
    return '0';
  }

  // djb2 hash algorithm variant
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    // Convert to 32-bit integer (prevent overflow)
    hash = hash & hash;
  }

  // Convert to positive integer and then to hex string
  const positiveHash = hash >>> 0; // Convert to unsigned 32-bit integer
  return positiveHash.toString(16);
}

/**
 * Creates a deterministic hash from profile data and job posting text.
 * 
 * This function combines profile data and job posting text into a single string,
 * normalizes it (sorts JSON keys for consistency), and creates a hash.
 * 
 * **Normalization:**
 * - Profile data is JSON stringified with sorted keys
 * - Job posting text is trimmed
 * - Combined string is hashed
 * 
 * **Use Case:**
 * - Creating cache keys for analysis results
 * - Ensuring same profile + job posting = same hash
 * 
 * @param profileData - Profile data object (will be JSON stringified)
 * @param jobPostingText - Job posting text
 * @returns Hash string suitable for use as cache key
 * 
 * @example
 * ```typescript
 * const profileData = { skills: 'TypeScript', experiences: [] };
 * const jobPostingText = 'Looking for TypeScript developer';
 * 
 * const hash1 = createAnalysisHash(profileData, jobPostingText);
 * const hash2 = createAnalysisHash(profileData, jobPostingText);
 * // hash1 === hash2 (deterministic)
 * ```
 */
export function createAnalysisHash(
  profileData: unknown,
  jobPostingText: string
): string {
  // Normalize profile data: JSON stringify with sorted keys
  // Handle null/undefined/primitive values
  let normalizedProfileData: string;
  if (profileData === null || profileData === undefined) {
    normalizedProfileData = JSON.stringify(profileData);
  } else if (typeof profileData === 'object') {
    // Sort keys for deterministic JSON stringification
    const keys = Object.keys(profileData as Record<string, unknown>).sort();
    normalizedProfileData = JSON.stringify(profileData, keys);
  } else {
    // Primitive values (string, number, boolean)
    normalizedProfileData = JSON.stringify(profileData);
  }
  
  // Normalize job posting text: trim whitespace
  const normalizedJobPosting = (jobPostingText || '').trim();
  
  // Combine and hash
  const combined = normalizedProfileData + normalizedJobPosting;
  return createHash(combined);
}

